<?php

namespace SurucuKursu;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;

class ApiClient {
    private $client;
    
    public function __construct($baseUri) {
        $this->client = new Client([
            'base_uri' => $baseUri,
            'timeout' => 30.0,
        ]);
    }
    
    /**
     * Update job status
     */
    public function updateJobStatus($jobId, $status, $message) {
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
                echo "✅ Job {$jobId} status updated to {$status} - {$message}\n";
            } else {
                echo "❌ Failed to update job {$jobId}. Status: {$statusCode}, Response: {$body}\n";
            }

        } catch (RequestException $e) {
            $this->logRequestError($jobId, $e);
        }
    }
    
    /**
     * Update job progress
     */
    public function updateJobProgress($jobId, $progress, $message = '') {
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
            
            if ($statusCode === 200 || $statusCode === 201) {
                echo "📊 Job {$jobId} progress updated to {$progress}% - {$message}\n";
            } else {
                $body = $response->getBody()->getContents();
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
    
    /**
     * Send completion notification to user
     */
    public function sendCompletionNotification($jobId, $userId, $pdfContent) {
        try {
            $response = $this->client->post('worker/sendtouser', [
                'json' => [
                    'userId' => $userId,
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
    
    /**
     * Log request error details
     */
    private function logRequestError($jobId, RequestException $e) {
        $errorDetails = [
            'jobId' => $jobId,
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
