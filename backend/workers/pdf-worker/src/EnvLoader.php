<?php

namespace SurucuKursu;

class EnvLoader {
    
    /**
     * Load environment variables from .env file
     */
    public static function load() {
        // Try multiple possible .env file locations
        $possiblePaths = [
            __DIR__ . '/../../../../backend/.env',  // From workspace root perspective
            __DIR__ . '/../../../.env',              // From backend/workers/pdf-worker to backend/.env
            __DIR__ . '/../../../../.env',           // From workspace root
        ];

        $envFile = null;
        foreach ($possiblePaths as $path) {
            if (file_exists($path)) {
                $envFile = $path;
                break;
            }
        }

        if (!$envFile) {
            echo "Warning: .env file not found in any of these locations:\n";
            foreach ($possiblePaths as $path) {
                echo "  - $path\n";
            }
            return;
        }

        echo "Loading .env file from: $envFile\n";

        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            // Skip comments
            if (strpos(trim($line), '#') === 0) {
                continue;
            }

            // Parse KEY=VALUE or KEY = VALUE
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
        echo "Environment variables loaded successfully\n";
    }
}
