<?php

require_once 'vendor/autoload.php';

use SurucuKursu\PdfGenerator;

echo "Testing PDF Generation...\n\n";

// Create sample data
$testData = [
    'drivingSchoolCode' => 'TEST001',
    // Add required drivingSchoolId for storage path creation
    'drivingSchoolId' => 1,
    'studentId' => 'STU12345',
    'studentName' => 'John Doe',
    'template' => 'standard',
    'certificateType' => 'Driving License Certificate',
    'courseType' => 'Class B Driving Course'
];

try {
    $pdfGenerator = new PdfGenerator();
    
    echo "Generating test PDF...\n";
    $pdfBase64 = $pdfGenerator->createSinglePdf($testData);
    
    echo "\n✅ Success! PDF generated and saved.\n";
    echo "Base64 length: " . strlen($pdfBase64) . " characters\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
