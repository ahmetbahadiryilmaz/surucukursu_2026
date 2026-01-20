<?php

namespace SurucuKursu;

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

class PdfWorker {
    private $connection;
    private $channel;
    private $apiClient;
    private $pdfGenerator;
    private $queueName = 'pdf_generation_queue';
    private $shouldStop = false;

    public function __construct() {
        // Load environment variables
        EnvLoader::load();

        // Initialize API client
        $apiServerPort = getenv('API_SERVER_PORT') ?: '9502';
        $baseUri = "http://localhost:{$apiServerPort}/api/v1/";
        echo "API Base URI: $baseUri\n";
        
        $this->apiClient = new ApiClient($baseUri);
        $this->pdfGenerator = new PdfGenerator();

        $this->connectToRabbitMQ();
        $this->setupSignalHandlers();
    }

    private function setupSignalHandlers() {
        // Handle shutdown signals gracefully
        if (function_exists('pcntl_signal')) {
            declare(ticks = 1);
            pcntl_signal(SIGTERM, [$this, 'handleShutdown']);
            pcntl_signal(SIGINT, [$this, 'handleShutdown']);
            echo "Signal handlers registered\n";
        }
    }

    public function handleShutdown($signal) {
        echo "\nReceived shutdown signal ($signal), stopping worker gracefully...\n";
        $this->shouldStop = true;
        
        if ($this->channel && $this->channel->is_consuming()) {
            $this->channel->basic_cancel('');
        }
    }

    private function connectToRabbitMQ() {
        try {
            $host = getenv('RABBITMQ_HOST') ?: 'localhost';
            $port = getenv('RABBITMQ_PORT') ?: 5672;
            $user = getenv('RABBITMQ_USER') ?: 'guest';
            $password = getenv('RABBITMQ_PASSWORD') ?: 'guest';
            $vhost = getenv('RABBITMQ_VHOST') ?: '/';

            echo "Connecting to RabbitMQ at $host:$port as $user (vhost: $vhost)\n";

            $this->connection = new AMQPStreamConnection(
                $host,
                $port,
                $user,
                $password,
                $vhost
            );
            $this->channel = $this->connection->channel();
            $this->channel->queue_declare($this->queueName, false, true, false, false);

            echo "Connected to RabbitMQ successfully on vhost: $vhost\n";
        } catch (\Exception $e) {
            echo "Failed to connect to RabbitMQ: " . $e->getMessage() . "\n";
            echo "RabbitMQ Config - Host: " . (getenv('RABBITMQ_HOST') ?: 'localhost') . ", Port: " . (getenv('RABBITMQ_PORT') ?: 5672) . "\n";
            exit(1);
        }
    }

    public function start() {
        echo "Starting PDF Worker...\n";
        echo "Listening to queue: {$this->queueName}\n";
        echo "Press Ctrl+C to stop gracefully\n";

        $callback = function ($msg) {
            if ($this->shouldStop) {
                return;
            }
            echo "=== MESSAGE RECEIVED ===\n";
            echo "Consuming message: " . $msg->body . "\n";
            echo "========================\n";
            $this->processMessage($msg);
        };

        $this->channel->basic_consume($this->queueName, '', false, true, false, false, $callback);
        echo "Consumer started, waiting for messages...\n";

        while ($this->channel->is_consuming() && !$this->shouldStop) {
            try {
                $this->channel->wait(null, false, 5); // 5 second timeout to check shouldStop
            } catch (\PhpAmqpLib\Exception\AMQPTimeoutException $e) {
                // Timeout is expected - just continue to check shouldStop flag
                continue;
            } catch (\Exception $e) {
                if ($this->shouldStop) {
                    break;
                }
                echo "Error while waiting for messages: " . $e->getMessage() . "\n";
            }
        }

        echo "PDF Worker stopped\n";
        $this->cleanup();
    }

    private function processMessage(AMQPMessage $msg) {
        $data = json_decode($msg->body, true);

        if (!$data || !isset($data['id'])) {
            echo "Invalid message format\n";
            return;
        }

        $jobId = $data['id'];
        $userId = $data['userId'];
        $mode = $data['mode'];
        $jobType = $data['type'] ?? 'single_simulation'; // Job type from the request
        $simulatorType = $data['simulationType'] ?? 'sesim'; // Simulator type (sesim/ana_grup)

        echo "=== DEBUG: Raw message data ===\n";
        echo "Job ID: {$jobId}\n";
        echo "User ID: {$userId}\n";
        echo "Mode: {$mode}\n";
        echo "Job Type (from message): " . ($data['type'] ?? 'NOT SET') . "\n";
        echo "Job Type (used): {$jobType}\n";
        echo "Simulator Type: {$simulatorType}\n";
        echo "===============================\n";

        // Merge simulatorType into data for PDF generation
        $jobData = $data['data'];
        $jobData['simulatorType'] = $simulatorType;

        try {
            // Update job status to processing
            $this->apiClient->updateJobStatus($jobId, 'processing', 'PDF generation started');

            if ($mode === 'single') {
                $this->generateSinglePdf($jobId, $userId, $jobData, $jobType);
            } elseif ($mode === 'group') {
                $this->generateGroupPdf($jobId, $userId, $jobData, $jobType);
            } else {
                throw new \Exception("Unknown PDF generation mode: {$mode}");
            }

        } catch (\Exception $e) {
            echo "Error processing job {$jobId}: " . $e->getMessage() . "\n";
            $this->apiClient->updateJobStatus($jobId, 'failed', $e->getMessage());
        }
    }

    private function generateSinglePdf($jobId, $userId, $data, $jobType = 'single_simulation') {
        echo "Generating single PDF for job {$jobId}, type: {$jobType}\n";
        
        // Validate that drivingSchoolId is present
        if (!isset($data['drivingSchoolId']) || empty($data['drivingSchoolId'])) {
            throw new \Exception("drivingSchoolId is required but was not provided in the job data");
        }
        
        echo "Driving School ID: {$data['drivingSchoolId']}\n";

        // Progress tracking
        $this->apiClient->updateJobProgress($jobId, 10, "Preparing PDF template...");
        
        $this->apiClient->updateJobProgress($jobId, 30, "Fetching data...");
        
        $this->apiClient->updateJobProgress($jobId, 50, "Generating content...");
        
        $this->apiClient->updateJobProgress($jobId, 70, "Rendering PDF...");
        
        // Generate PDF based on job type
        $pdfContent = $this->generatePdfByType($data, $jobType);
        
        $this->apiClient->updateJobProgress($jobId, 90, "Finalizing PDF...");

        // Complete the job with 100% progress
        $this->apiClient->updateJobProgress($jobId, 100, "PDF generation completed");
        $this->completeJob($jobId, $userId, $pdfContent);

        echo "Single PDF generation completed for job {$jobId}\n";
    }

    private function generateGroupPdf($jobId, $userId, $data, $jobType = 'group_simulation') {
        echo "Generating group PDF for job {$jobId}, type: {$jobType}\n";

        // Validate that drivingSchoolId is present
        if (!isset($data['drivingSchoolId']) || empty($data['drivingSchoolId'])) {
            throw new \Exception("drivingSchoolId is required but was not provided in the job data");
        }
        
        echo "Driving School ID: {$data['drivingSchoolId']}\n";

        $studentIds = $data['studentIds'] ?? [];
        $totalStudents = count($studentIds);

        if ($totalStudents === 0) {
            throw new \Exception("No students specified for group PDF generation");
        }

        $this->apiClient->updateJobProgress($jobId, 5, "Processing {$totalStudents} students");

        $pdfContents = [];

        for ($i = 0; $i < $totalStudents; $i++) {
            $studentId = $studentIds[$i];
            $progress = (int)(10 + (($i + 1) / $totalStudents) * 75);

            $this->apiClient->updateJobProgress($jobId, $progress, "Processing student {$studentId} (" . ($i + 1) . "/{$totalStudents})");

            // Generate individual PDF for this student based on job type
            $studentData = array_merge($data, ['studentId' => $studentId]);
            $pdfContents[] = $this->generatePdfByType($studentData, $jobType);

            // Small delay between students
            usleep(500000); // 0.5 seconds
        }

        $this->apiClient->updateJobProgress($jobId, 90, 'Combining PDFs');

        // Combine all PDFs into one, using the driving school ID from data
        $combinedPdf = $this->pdfGenerator->createGroupPdf($pdfContents, $data['drivingSchoolId']);

        $this->apiClient->updateJobProgress($jobId, 95, 'Finalizing group PDF');
        $this->apiClient->updateJobProgress($jobId, 100, 'PDF generation completed');
        $this->completeJob($jobId, $userId, $combinedPdf);

        echo "Group PDF generation completed for job {$jobId}\n";
    }

    /**
     * Generate PDF based on job type
     * Routes to the appropriate PDF generator method
     */
    private function generatePdfByType($data, $jobType) {
        echo "generatePdfByType called with jobType: '{$jobType}'\n";
        
        switch ($jobType) {
            case 'single_direksiyon_takip':
            case 'group_direksiyon_takip':
                echo "✅ MATCHED: Using Direksiyon Takip template\n";
                $result = $this->pdfGenerator->createDireksiyonTakipPdf($data);
                return $result['content'] ?? '';
                
            case 'single_simulation':
            case 'group_simulation':
                echo "✅ MATCHED: Using Simulation template (type: " . ($data['simulatorType'] ?? 'sesim') . ")\n";
                $result = $this->pdfGenerator->createSimulationPdf($data);
                // For simulation, we may have multiple files (anagrup), return the first or combined
                if (isset($result['files']) && is_array($result['files'])) {
                    return $result['files'][0]['content'] ?? '';
                }
                return $result['content'] ?? '';
                
            case 'ek4':
                echo "✅ MATCHED: Using EK-4 template\n";
                $result = $this->pdfGenerator->createEk4Pdf($data);
                return $result['content'] ?? '';
                
            default:
                // Fallback to the old createSinglePdf for backward compatibility
                echo "⚠️ NO MATCH: Using default (certificate) template for unknown job type: '{$jobType}'\n";
                echo "   Expected types: 'single_direksiyon_takip', 'group_direksiyon_takip', 'single_simulation', 'group_simulation', 'ek4'\n";
                return $this->pdfGenerator->createSinglePdf($data);
        }
    }

    private function completeJob($jobId, $userId, $pdfContent) {
        echo "PDF generation completed\n";
        
        // Send completion notification via socket
        $this->apiClient->sendCompletionNotification($jobId, $userId, $pdfContent);
    }

    private function cleanup() {
        echo "Cleaning up connections...\n";
        try {
            if ($this->channel) {
                $this->channel->close();
                echo "Channel closed\n";
            }
            if ($this->connection) {
                $this->connection->close();
                echo "Connection closed\n";
            }
        } catch (\Exception $e) {
            echo "Error during cleanup: " . $e->getMessage() . "\n";
        }
    }

    public function __destruct() {
        if (!$this->shouldStop) {
            $this->cleanup();
        }
    }
}
