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
    }

    private function connectToRabbitMQ() {
        try {
            $host = getenv('RABBITMQ_HOST') ?: 'localhost';
            $port = getenv('RABBITMQ_PORT') ?: 5672;
            $user = getenv('RABBITMQ_USER') ?: 'guest';
            $password = getenv('RABBITMQ_PASSWORD') ?: 'guest';

            echo "Connecting to RabbitMQ at $host:$port as $user\n";

            $this->connection = new AMQPStreamConnection(
                $host,
                $port,
                $user,
                $password
            );
            $this->channel = $this->connection->channel();
            $this->channel->queue_declare($this->queueName, false, true, false, false);

            echo "Connected to RabbitMQ successfully\n";
        } catch (\Exception $e) {
            echo "Failed to connect to RabbitMQ: " . $e->getMessage() . "\n";
            echo "RabbitMQ Config - Host: " . (getenv('RABBITMQ_HOST') ?: 'localhost') . ", Port: " . (getenv('RABBITMQ_PORT') ?: 5672) . "\n";
            exit(1);
        }
    }

    public function start() {
        echo "Starting PDF Worker...\n";

        $callback = function ($msg) {
            $this->processMessage($msg);
        };

        $this->channel->basic_consume($this->queueName, '', false, true, false, false, $callback);

        while ($this->channel->is_consuming()) {
            $this->channel->wait();
        }
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

        echo "Processing job {$jobId} for user {$userId}\n";

        try {
            // Update job status to processing
            $this->apiClient->updateJobStatus($jobId, 'processing', 'PDF generation started');

            if ($mode === 'single') {
                $this->generateSinglePdf($jobId, $userId, $data['data']);
            } elseif ($mode === 'group') {
                $this->generateGroupPdf($jobId, $userId, $data['data']);
            } else {
                throw new \Exception("Unknown PDF generation mode: {$mode}");
            }

        } catch (\Exception $e) {
            echo "Error processing job {$jobId}: " . $e->getMessage() . "\n";
            $this->apiClient->updateJobStatus($jobId, 'failed', $e->getMessage());
        }
    }

    private function generateSinglePdf($jobId, $userId, $data) {
        echo "Generating single PDF for job {$jobId}\n";
        
        // Validate that drivingSchoolId is present
        if (!isset($data['drivingSchoolId']) || empty($data['drivingSchoolId'])) {
            throw new \Exception("drivingSchoolId is required but was not provided in the job data");
        }
        
        echo "Driving School ID: {$data['drivingSchoolId']}\n";

        // Simulate PDF generation process with progress tracking
        $this->apiClient->updateJobProgress($jobId, 10, "Preparing PDF template...");
        sleep(1);
        
        $this->apiClient->updateJobProgress($jobId, 30, "Fetching student data...");
        sleep(1);
        
        $this->apiClient->updateJobProgress($jobId, 50, "Generating certificate content...");
        sleep(1);
        
        $this->apiClient->updateJobProgress($jobId, 70, "Rendering PDF...");
        
        // Generate PDF using Dompdf
        $pdfContent = $this->pdfGenerator->createSinglePdf($data);
        
        $this->apiClient->updateJobProgress($jobId, 90, "Finalizing PDF...");
        sleep(1);

        // Complete the job with 100% progress
        $this->apiClient->updateJobProgress($jobId, 100, "PDF generation completed");
        $this->completeJob($jobId, $userId, $pdfContent);

        echo "Single PDF generation completed for job {$jobId}\n";
    }

    private function generateGroupPdf($jobId, $userId, $data) {
        echo "Generating group PDF for job {$jobId}\n";

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

            // Generate individual PDF for this student
            $studentData = array_merge($data, ['studentId' => $studentId]);
            $pdfContents[] = $this->pdfGenerator->createSinglePdf($studentData);

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

    private function completeJob($jobId, $userId, $pdfContent) {
        echo "PDF generation completed\n";
        
        // Send completion notification via socket
        $this->apiClient->sendCompletionNotification($jobId, $userId, $pdfContent);
    }

    public function __destruct() {
        if ($this->channel) {
            $this->channel->close();
        }
        if ($this->connection) {
            $this->connection->close();
        }
    }
}
