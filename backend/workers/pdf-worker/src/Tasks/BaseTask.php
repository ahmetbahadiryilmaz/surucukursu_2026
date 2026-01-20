<?php

namespace SurucuKursu\Tasks;

use Dompdf\Dompdf;
use Dompdf\Options;

/**
 * Base class for all PDF generation tasks
 */
abstract class BaseTask {
    
    protected $templatePath;
    protected $storagePath;
    protected $drivingSchoolId;
    protected $companyName;
    
    public function __construct($drivingSchoolId, $companyName = '') {
        $this->drivingSchoolId = $drivingSchoolId;
        $this->companyName = $companyName;
        $this->templatePath = __DIR__ . '/../../data/templates';
        // Storage path: backend/storage/DS{id}
        $this->storagePath = __DIR__ . '/../../../../storage/DS' . $drivingSchoolId;
        
        // Ensure storage directory exists
        if (!file_exists($this->storagePath)) {
            mkdir($this->storagePath, 0755, true);
        }
    }
    
    /**
     * Generate PDF from HTML string
     */
    protected function generatePdfFromHtml($html) {
        // Use simple_html_dom to parse and normalize the HTML first
        try {
            if (function_exists('str_get_html')) {
                $dom = str_get_html($html, true, true, 'UTF-8');
                if ($dom !== false && is_object($dom)) {
                    $cleanHtml = $dom->save();
                    if (!empty($cleanHtml)) {
                        $html = $cleanHtml;
                    }
                    $dom->clear();
                    unset($dom);
                }
            }
        } catch (\Throwable $e) {
            error_log('simple_html_dom parse error: ' . $e->getMessage());
        }

        $options = new Options();
        $options->set('isHtml5ParserEnabled', true);
        $options->set('isPhpEnabled', true);
        $options->set('defaultFont', 'DejaVu Sans');
        $options->set('isRemoteEnabled', true);
        $options->set('chroot', realpath(__DIR__ . '/../../'));
        
        $dompdf = new Dompdf($options);
        $html = mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8');
        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();
        
        return $dompdf->output();
    }
    
    /**
     * Save PDF to file and return base64 encoded content
     */
    protected function savePdf($html, $subFolder, $filename, $checkExists = true) {
        // Handle empty subfolder - save directly to storage path
        if (empty($subFolder)) {
            $path = $this->storagePath;
        } else {
            $path = $this->storagePath . '/' . $subFolder;
        }
        
        echo "Storage path: {$this->storagePath}\n";
        echo "Final path: {$path}\n";
        
        // Create directory if not exists
        if (!file_exists($path)) {
            mkdir($path, 0755, true);
            echo "Created directory: {$path}\n";
        }
        
        $fullPath = $path . '/' . $filename;
        
        // Check if file already exists
        if ($checkExists && file_exists($fullPath)) {
            echo "File already exists: {$fullPath}\n";
            return ['status' => 'exists', 'path' => $fullPath];
        }
        
        $pdfContent = $this->generatePdfFromHtml($html);
        file_put_contents($fullPath, $pdfContent);
        
        echo "✅ PDF saved to: {$fullPath}\n";
        
        return ['status' => 'success', 'path' => $fullPath, 'content' => base64_encode($pdfContent)];
    }
    
    /**
     * Convert Turkish characters to SEO-friendly format
     */
    protected function seo($text) {
        $find = array('Ç', 'Ş', 'Ğ', 'Ü', 'İ', 'Ö', 'ç', 'ş', 'ğ', 'ü', 'ö', 'ı', '+', '#');
        $replace = array('c', 's', 'g', 'u', 'i', 'o', 'c', 's', 'g', 'u', 'o', 'i', 'plus', 'sharp');
        $text = strtolower(str_replace($find, $replace, $text));
        $text = preg_replace("@[^A-Za-z0-9\-_\.\+]@i", ' ', $text);
        $text = trim(preg_replace('/\s+/', ' ', $text));
        $text = str_replace(' ', '-', $text);
        return $text;
    }
    
    /**
     * Abstract method - each task must implement this
     */
    abstract public function generate($data);
}
