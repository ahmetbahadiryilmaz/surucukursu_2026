<?php

require_once 'vendor/autoload.php';

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;

class PdfWorker {
    private $connection;
    private $channel;
    private $client;
    private $queueName = 'pdf_generation_queue';

    public function __construct() {
        // Load environment variables from backend .env file
        $this->loadEnvFile();

        // Initialize HTTP client for API calls
        $this->client = new Client([
            'base_uri' => 'http://localhost:3000/api/v1/',
            'timeout' => 30.0,
        ]);

        $this->connectToRabbitMQ();
    }

    private function loadEnvFile() {
        $envFile = __DIR__ . '/../../../.env'; // Path to backend .env file

        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                // Skip comments
                if (strpos(trim($line), '#') === 0) {
                    continue;
                }

                // Parse KEY=VALUE
                if (strpos($line, '=') !== false) {
                    list($key, $value) = explode('=', $line, 2);
                    $key = trim($key);
                    $value = trim($value);

                    // Remove quotes if present
                    $value = trim($value, '"\'');

                    putenv("$key=$value");
                    $_ENV[$key] = $value;
                    $_SERVER[$key] = $value;
                }
            }
            echo "Environment variables loaded from .env file\n";
        } else {
            echo "Warning: .env file not found at $envFile\n";
        }
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
        } catch (Exception $e) {
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
            $this->updateJobStatus($jobId, 'processing', 'PDF generation started');

            if ($mode === 'single') {
                $this->generateSinglePdf($jobId, $userId, $data['data']);
            } elseif ($mode === 'group') {
                $this->generateGroupPdf($jobId, $userId, $data['data']);
            } else {
                throw new Exception("Unknown PDF generation mode: {$mode}");
            }

        } catch (Exception $e) {
            echo "Error processing job {$jobId}: " . $e->getMessage() . "\n";
            $this->updateJobStatus($jobId, 'failed', $e->getMessage());
        }
    }

    private function generateSinglePdf($jobId, $userId, $data) {
        echo "Generating single PDF for job {$jobId}\n";

        // Simulate PDF generation process with progress tracking
        $this->updateJobProgress($jobId, 10, "Preparing PDF template...");
        sleep(1);
        
        $this->updateJobProgress($jobId, 30, "Fetching student data...");
        sleep(1);
        
        $this->updateJobProgress($jobId, 50, "Generating certificate content...");
        sleep(1);
        
        $this->updateJobProgress($jobId, 70, "Rendering PDF...");
        sleep(1);
        
        $this->updateJobProgress($jobId, 90, "Finalizing PDF...");

        // Generate a simple PDF (in real implementation, use a PDF library like TCPDF, FPDF, etc.)
        $pdfContent = $this->createSamplePdf($data);

        sleep(1);

        // Complete the job with 100% progress
        $this->updateJobProgress($jobId, 100, "PDF generation completed");
        $this->completeJob($jobId, $pdfContent);

        echo "Single PDF generation completed for job {$jobId}\n";
    }

    private function generateGroupPdf($jobId, $userId, $data) {
        echo "Generating group PDF for job {$jobId}\n";

        $studentIds = $data['studentIds'] ?? [];
        $totalStudents = count($studentIds);

        if ($totalStudents === 0) {
            throw new Exception("No students specified for group PDF generation");
        }

        $this->updateJobProgress($jobId, 5, "Processing {$totalStudents} students");

        $pdfContents = [];

        for ($i = 0; $i < $totalStudents; $i++) {
            $studentId = $studentIds[$i];
            $progress = (int)(10 + (($i + 1) / $totalStudents) * 75);

            $this->updateJobProgress($jobId, $progress, "Processing student {$studentId} (" . ($i + 1) . "/{$totalStudents})");

            // Generate individual PDF for this student
            $studentData = array_merge($data, ['studentId' => $studentId]);
            $pdfContents[] = $this->createSamplePdf($studentData);

            // Small delay between students
            usleep(500000); // 0.5 seconds
        }

        $this->updateJobProgress($jobId, 90, 'Combining PDFs');

        // In a real implementation, combine all PDFs into one
        $combinedPdf = $this->combinePdfs($pdfContents);

        $this->updateJobProgress($jobId, 95, 'Finalizing group PDF');

        $this->updateJobProgress($jobId, 100, 'PDF generation completed');
        $this->completeJob($jobId, $combinedPdf);

        echo "Group PDF generation completed for job {$jobId}\n";
    }

    private function createSamplePdf($data) {
        // This is a placeholder - in real implementation, use TCPDF, FPDF, or similar
        // For now, return base64 encoded sample content
        $sampleContent = "PDF Certificate for Student ID: " . ($data['studentId'] ?? 'Unknown') . "\n";
        $sampleContent .= "Generated at: " . date('Y-m-d H:i:s') . "\n";
        $sampleContent .= "Template: " . ($data['template'] ?? 'default') . "\n";

        return base64_encode($sampleContent);
    }

    private function combinePdfs($pdfContents) {
        // Placeholder for PDF combination logic
        // In real implementation, use PDF libraries to merge files
        $combined = "Combined PDF containing " . count($pdfContents) . " certificates\n";
        $combined .= "Generated at: " . date('Y-m-d H:i:s') . "\n";

        return base64_encode($combined);
    }

    private function updateJobStatus($jobId, $status, $message) {
        try {
            $response = $this->client->post('worker/update-job', [
                'json' => [
                    'jobId' => $jobId,
                    'progress' => $status === 'completed' ? 100 : ($status === 'failed' ? -1 : 50),
                    'status' => $status
                ],
                'timeout' => 10,
                'connect_timeout' => 5
            ]);

            $statusCode = $response->getStatusCode();
            $body = $response->getBody()->getContents();
            
            if ($statusCode === 200 || $statusCode === 201) {
                $result = json_decode($body, true);
                echo "✅ Job {$jobId} status updated to {$status} - {$message}\n";
            } else {
                echo "❌ Failed to update job {$jobId}. Status: {$statusCode}, Response: {$body}\n";
            }

        } catch (RequestException $e) {
            $errorDetails = [
                'jobId' => $jobId,
                'status' => $status,
                'message' => $message,
                'error' => $e->getMessage(),
                'code' => $e->getCode()
            ];
            
            if ($e->hasResponse()) {
                $response = $e->getResponse();
                $errorDetails['http_status'] = $response->getStatusCode();
                $errorDetails['response_body'] = $response->getBody()->getContents();
            }
            
            echo "❌ Failed to update job status for {$jobId}:\n";
            echo "   Error: " . $e->getMessage() . "\n";
            echo "   Code: " . $e->getCode() . "\n";
            
            if (isset($errorDetails['http_status'])) {
                echo "   HTTP Status: " . $errorDetails['http_status'] . "\n";
                echo "   Response: " . $errorDetails['response_body'] . "\n";
            }
        }
    }

    private function updateJobProgress($jobId, $progress, $message = '') {
        try {
            $response = $this->client->post('worker/update-job', [
                'json' => [
                    'jobId' => $jobId,
                    'progress' => $progress,
                    'status' => $progress >= 100 ? 'completed' : ($progress < 0 ? 'failed' : 'processing'),
                    'message' => $message
                ],
                'timeout' => 10,
                'connect_timeout' => 5
            ]);

            $statusCode = $response->getStatusCode();
            $body = $response->getBody()->getContents();
            
            if ($statusCode === 200 || $statusCode === 201) {
                echo "📊 Job {$jobId} progress updated to {$progress}% - {$message}\n";
            } else {
                echo "❌ Failed to update progress for job {$jobId}. Status: {$statusCode}, Response: {$body}\n";
            }

        } catch (RequestException $e) {
            echo "❌ Failed to update job progress for {$jobId}: " . $e->getMessage() . "\n";
            if ($e->hasResponse()) {
                $response = $e->getResponse();
                echo "   HTTP Status: " . $response->getStatusCode() . "\n";
                echo "   Response: " . $response->getBody()->getContents() . "\n";
            }
        }
    }

    private function completeJob($jobId, $pdfContent) {
        try {
            // Mark job as completed
            echo "PDF generation completed\n";

            // Then send completion notification via socket
            $response = $this->client->post('worker/sendtouser', [
                'json' => [
                    'userId' => 1, // In real implementation, get from job data
                    'tag' => 'pdf-completed',
                    'data' => [
                        'jobId' => $jobId,
                        'pdfData' => $pdfContent,
                        'fileName' => "certificate_{$jobId}.pdf"
                    ]
                ],
                'timeout' => 10,
                'connect_timeout' => 5
            ]);

            $statusCode = $response->getStatusCode();
            if ($statusCode === 200 || $statusCode === 201) {
                echo "✅ Job {$jobId} completed successfully\n";
            } else {
                echo "⚠️  Job {$jobId} progress updated but socket notification failed. Status: {$statusCode}\n";
            }

        } catch (RequestException $e) {
            echo "❌ Failed to send completion notification for job {$jobId}: " . $e->getMessage() . "\n";
            
            if ($e->hasResponse()) {
                $response = $e->getResponse();
                echo "   HTTP Status: " . $response->getStatusCode() . "\n";
                echo "   Response: " . $response->getBody()->getContents() . "\n";
            }
        }
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

// Run the worker
$worker = new PdfWorker();
$worker->start();

?>
