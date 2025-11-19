<?php

require_once 'vendor/autoload.php';

use SurucuKursu\PdfWorker;

// Run the worker
$worker = new PdfWorker();
$worker->start();
