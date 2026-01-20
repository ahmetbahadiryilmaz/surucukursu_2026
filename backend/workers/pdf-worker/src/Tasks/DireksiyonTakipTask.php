<?php

namespace SurucuKursu\Tasks;

require_once __DIR__ . '/../Lib/simple_html_dom.php';

/**
 * DireksiyonTakipTask - Generates "Direksiyon Takip Formu" PDFs
 * 
 * This task handles the generation of driving training tracking forms.
 * It doesn't depend on simulator settings - always uses direksiyon-takip templates.
 */
class DireksiyonTakipTask extends BaseTask {
    
    private $templateDir;
    
    public function __construct($drivingSchoolId, $companyName = '') {
        parent::__construct($drivingSchoolId, $companyName);
        $this->templateDir = $this->templatePath . '/direksiyon-takip';
    }
    
    /**
     * Generate Direksiyon Takip Form PDF
     * 
     * @param array $data Contains:
     *   - studentInfo: array with tc-kimlik-no, ad-soyad, istenen-sertifika
     *   - lessonRecords: array of lesson records with date, time, plate, trainer info
     *   - period: Education period (dönem)
     * @return array Result with status and path
     */
    public function generate($data) {
        // Support both old format (studentInfo object) and new format (flat data)
        $studentInfo = $data['studentInfo'] ?? [];
        
        // If studentInfo is empty, try to build it from flat data
        if (empty($studentInfo)) {
            $nestedData = $data['data'] ?? [];
            $studentInfo = [
                'ad-soyad' => $nestedData['studentName'] ?? $data['studentName'] ?? 'Bilinmeyen',
                'tc-kimlik-no' => $nestedData['tcNumber'] ?? $data['tcNumber'] ?? $data['studentId'] ?? 'unknown',
                'istenen-sertifika' => $nestedData['certificateType'] ?? $data['certificateType'] ?? ''
            ];
        }
        
        $lessonRecords = $data['lessonRecords'] ?? [];
        $period = $data['period'] ?? date('Y');
        
        // Determine template based on lesson count and simulator presence
        $lessonCount = count($lessonRecords);
        $hasSimulator = $this->checkHasSimulator($lessonRecords);
        
        $templateFile = $this->getTemplateFile($lessonCount, $hasSimulator);
        
        if (!$templateFile || !file_exists($templateFile)) {
            throw new \Exception("Template not found for {$lessonCount} lessons. Template path: {$templateFile}");
        }
        
        // Filter out simulator lessons if template doesn't support them
        if (!$hasSimulator || !$this->templateSupportsSimulator($lessonCount)) {
            $lessonRecords = $this->filterNonSimulatorLessons($lessonRecords);
        }
        
        // Load and process template
        $html = $this->processTemplate($templateFile, $studentInfo, $lessonRecords);
        
        // Generate filename
        $studentName = $this->seo($studentInfo['ad-soyad'] ?? 'unknown');
        $tcNo = $studentInfo['tc-kimlik-no'] ?? 'unknown';
        $timestamp = date('Y-m-d_H-i-s');
        
        // Save directly to DS folder with timestamp for uniqueness
        $subFolder = '';
        $filename = "direksiyon_{$tcNo}_{$studentName}_{$timestamp}.pdf";
        
        echo "Saving PDF: {$filename}\n";
        echo "Student Info: " . json_encode($studentInfo) . "\n";
        
        return $this->savePdf($html, $subFolder, $filename);
    }
    
    /**
     * Check if any lesson is simulator-based
     */
    private function checkHasSimulator($lessonRecords) {
        foreach ($lessonRecords as $record) {
            $lessonType = $record['ders_yeri'] ?? $record[5] ?? '';
            if (stripos($lessonType, 'Simulatör') !== false || 
                stripos($lessonType, 'Direksiyon Eğitim Alanı') !== false) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Get appropriate template file
     */
    private function getTemplateFile($lessonCount, $hasSimulator) {
        // Available templates: 4n, 6n, 7n, 12nsimli, 14n, 14nsimli, 16n, 16nsimli, 20n
        $supportedCounts = [4, 6, 7, 12, 14, 16, 20];
        
        // Find closest supported count
        $closestCount = 4;
        foreach ($supportedCounts as $count) {
            if ($lessonCount <= $count) {
                $closestCount = $count;
                break;
            }
        }
        if ($lessonCount > 20) {
            $closestCount = 20;
        }
        
        // Check if simli version exists and should be used
        if ($hasSimulator && in_array($closestCount, [12, 14, 16])) {
            $simliFile = $this->templateDir . "/{$closestCount}nsimli.html";
            if (file_exists($simliFile)) {
                return $simliFile;
            }
        }
        
        return $this->templateDir . "/{$closestCount}n.html";
    }
    
    /**
     * Check if the template supports simulator lessons
     */
    private function templateSupportsSimulator($lessonCount) {
        return in_array($lessonCount, [12, 14, 16]);
    }
    
    /**
     * Filter out simulator lessons
     */
    private function filterNonSimulatorLessons($lessonRecords) {
        return array_values(array_filter($lessonRecords, function($record) {
            $lessonType = $record['ders_yeri'] ?? $record[5] ?? '';
            return stripos($lessonType, 'Simulatör') === false && 
                   stripos($lessonType, 'Direksiyon Eğitim Alanı') === false;
        }));
    }
    
    /**
     * Process template with student and lesson data
     */
    private function processTemplate($templateFile, $studentInfo, $lessonRecords) {
        $html = new \simple_html_dom();
        $html->load_file($templateFile);
        
        // Extract class from certificate
        $class = $this->extractClass($studentInfo['istenen-sertifika'] ?? '');
        
        // Fill student info
        $nameEl = $html->find('.name', 0);
        if ($nameEl) $nameEl->innertext = $studentInfo['ad-soyad'] ?? '';
        
        $tcEl = $html->find('.tc', 0);
        if ($tcEl) $tcEl->innertext = $studentInfo['tc-kimlik-no'] ?? '';
        
        $classEl = $html->find('.vClass', 0);
        if ($classEl) $classEl->innertext = $class;
        
        // Fill lesson data
        $dates = $html->find('.date');
        $plates = $html->find('.plate');
        $trainers = $html->find('.mTrainer');
        
        foreach ($dates as $idx => $dateEl) {
            if (isset($lessonRecords[$idx])) {
                $record = $lessonRecords[$idx];
                $date = $record['ders_tarihi'] ?? $record[6] ?? '';
                $time = $record['ders_saati'] ?? $record[7] ?? '';
                $dateEl->innertext = "<span style='font-size:9px'>{$date}</span><br><span style='font-size:7px'>{$time}</span>";
            }
        }
        
        foreach ($plates as $idx => $plateEl) {
            if (isset($lessonRecords[$idx])) {
                $record = $lessonRecords[$idx];
                $plate = $record['arac_plakasi'] ?? $record[4] ?? '';
                $plate = str_replace(['(Manuel)', '(Otomatik)'], '', $plate);
                $plateEl->innertext = trim($plate);
            }
        }
        
        foreach ($trainers as $idx => $trainerEl) {
            if (isset($lessonRecords[$idx])) {
                $record = $lessonRecords[$idx];
                $trainer = $record['dersi_veren_personel'] ?? $record[8] ?? '';
                $trainerEl->innertext = $trainer;
            }
        }
        
        $result = $html->save();
        $html->clear();
        
        return $result;
    }
    
    /**
     * Extract class letter from certificate string (e.g., "B SINIFI SERTİFİKA" -> "B")
     */
    private function extractClass($certificateString) {
        $parts = explode(' ', trim($certificateString));
        return $parts[0] ?? 'B';
    }
}
