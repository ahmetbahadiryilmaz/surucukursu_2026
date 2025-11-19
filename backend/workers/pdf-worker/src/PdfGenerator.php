<?php

namespace SurucuKursu;

use Dompdf\Dompdf;
use Dompdf\Options;
// Include simple_html_dom parser to normalize/clean HTML templates before PDF rendering
require_once __DIR__ . '/../simple_html_dom.php';

class PdfGenerator {
    
    /**
     * Create storage directory structure: storage/DS[id]/
     * Works on both Windows and Linux with proper permissions
     */
    public function createStorageDirectory($drivingSchoolId) {
        // Determine the base storage path (backend/storage)
        $baseStoragePath = __DIR__ . '/../../../storage';
        
        // Create DS[id] directory (e.g., DS1, DS2, DS123)
        $schoolStoragePath = $baseStoragePath . DIRECTORY_SEPARATOR . 'DS' . $drivingSchoolId;
        
        if (!file_exists($schoolStoragePath)) {
            // Create directory with proper permissions
            // 0755 = owner can read/write/execute, group and others can read/execute
            $created = mkdir($schoolStoragePath, 0755, true);
            
            if ($created) {
                echo "✅ Created storage directory: {$schoolStoragePath}\n";
                
                // On Linux/Unix systems, explicitly set permissions
                if (DIRECTORY_SEPARATOR === '/') {
                    chmod($schoolStoragePath, 0755);
                    echo "✅ Set permissions (0755) for: {$schoolStoragePath}\n";
                }
            } else {
                throw new \Exception("Failed to create storage directory: {$schoolStoragePath}");
            }
        }
        
        return $schoolStoragePath;
    }
    
    /**
     * Generate a single certificate PDF
     */
    public function createSinglePdf($data) {
        // Get driving school ID from data - REQUIRED
        if (!isset($data['drivingSchoolId'])) {
            throw new \Exception("drivingSchoolId is required for PDF generation");
        }
        
        $drivingSchoolId = $data['drivingSchoolId'];
        $studentId = $data['studentId'] ?? 'Unknown';
        $template = $data['template'] ?? 'default';
        
        // Create storage directory with DS prefix (e.g., DS1, DS2, etc.)
        $storagePath = $this->createStorageDirectory($drivingSchoolId);
        
        // Generate PDF filename with human-readable timestamp (e.g., 2025-11-19_14-47-46)
        $timestamp = date('Y-m-d_H-i-s');
        $pdfFileName = "certificate_{$studentId}_{$timestamp}.pdf";
        $pdfFilePath = $storagePath . DIRECTORY_SEPARATOR . $pdfFileName;
        
        // Load HTML template from ek4.html file with UTF-8 encoding
        $templatePath = __DIR__ . '/../data/templates/ek4/ek4.html';
        if (!file_exists($templatePath)) {
            throw new \Exception("Template file not found: {$templatePath}");
        }
        
        // Read file with UTF-8 encoding
        $html = file_get_contents($templatePath);
        
        // Ensure UTF-8 encoding
        if (!mb_check_encoding($html, 'UTF-8')) {
            $html = utf8_encode($html);
        }
        
        // Replace placeholders with actual data
        $html = $this->replacePlaceholders($html, $data);
        
        // Generate PDF using Dompdf
        $output = $this->generatePdfFromHtml($html);
        
        // Save the PDF to storage
        file_put_contents($pdfFilePath, $output);
        
        echo "✅ PDF saved to: {$pdfFilePath}\n";
        
        // Return base64 encoded PDF content
        return base64_encode($output);
    }
    
    /**
     * Replace placeholders in HTML template with actual data
     */
    private function replacePlaceholders($html, $data) {
        // Extract data fields
        $studentName = $data['studentName'] ?? '';
        $plateNumber = $data['plateNumber'] ?? '';
        $instructorName = $data['instructorName'] ?? '';
        $companyName = $data['companyName'] ?? '';
        $examDate = $data['examDate'] ?? '';
        
        // Replace placeholders in the HTML
        $replacements = [
            '<span class="kursiyer"> &nbsp;</span>' => '<span class="kursiyer">' . htmlspecialchars($studentName) . '</span>',
            '<span class="plakano"> &nbsp;</span>' => '<span class="plakano">' . htmlspecialchars($plateNumber) . '</span>',
            '<span class="egitmen"> &nbsp;</span>' => '<span class="egitmen">' . htmlspecialchars($instructorName) . '</span>',
            '<span class="companyName"></span>' => '<span class="companyName">' . htmlspecialchars($companyName) . '</span>',
            '<td   rowspan="3" class="tarih">  </td>' => '<td rowspan="3" class="tarih">' . htmlspecialchars($examDate) . '</td>',
        ];
        
        foreach ($replacements as $search => $replace) {
            $html = str_replace($search, $replace, $html);
        }
        
        return $html;
    }
    
    /**
     * Generate a combined group certificate PDF
     */
    public function createGroupPdf($pdfContents, $drivingSchoolId) {
        // Validate driving school ID is provided
        if (empty($drivingSchoolId)) {
            throw new \Exception("drivingSchoolId is required for PDF generation");
        }
        
        // Use the provided driving school ID
        $storagePath = $this->createStorageDirectory($drivingSchoolId);
        
        // Generate PDF filename with human-readable timestamp (e.g., 2025-11-19_14-47-46)
        $timestamp = date('Y-m-d_H-i-s');
        $pdfFileName = "group_certificate_{$timestamp}.pdf";
        $pdfFilePath = $storagePath . DIRECTORY_SEPARATOR . $pdfFileName;
        
        // Create HTML for combined certificate
        $html = HtmlTemplates::generateGroupCertificateHtml($pdfContents);
        
        // Generate PDF using Dompdf
        $output = $this->generatePdfFromHtml($html);
        
        // Save the PDF to storage
        file_put_contents($pdfFilePath, $output);
        
        echo "✅ Combined PDF saved to: {$pdfFilePath}\n";
        
        return base64_encode($output);
    }
    
    /**
     * Generate PDF from HTML using Dompdf
     */
    private function generatePdfFromHtml($html) {
        // Use simple_html_dom to parse and normalize the HTML first. This
        // helps fix malformed markup coming from templates or external
        // sources so Dompdf receives well-formed HTML.
        try {
            if (function_exists('str_get_html')) {
                $dom = str_get_html($html, true, true, 'UTF-8');
                if ($dom !== false && is_object($dom)) {
                    // save() returns the normalized inner HTML of the document
                    $cleanHtml = $dom->save();
                    if (!empty($cleanHtml)) {
                        $html = $cleanHtml;
                    }
                    // free memory
                    $dom->clear();
                    unset($dom);
                }
            }
        } catch (\Throwable $e) {
            // If parsing fails, fall back to the original HTML and continue
            // — don't block PDF generation for parser issues.
            error_log('simple_html_dom parse error: ' . $e->getMessage());
        }

        $options = new Options();
        $options->set('isHtml5ParserEnabled', true);
        $options->set('isPhpEnabled', true);
        $options->set('defaultFont', 'DejaVu Sans');
        $options->set('isRemoteEnabled', true);
        $options->set('chroot', realpath(__DIR__ . '/../../'));
        $options->set('debugKeepTemp', false);
        $options->set('debugCss', false);
        $options->set('debugLayout', false);
        $options->set('debugLayoutLines', false);
        $options->set('debugLayoutBlocks', false);
        $options->set('debugLayoutInline', false);
        $options->set('debugLayoutPaddingBox', false);
        
        $dompdf = new Dompdf($options);
        
        // Ensure UTF-8 encoding for Turkish characters
        $html = mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8');
        
        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();
        
        return $dompdf->output();
    }
}
