<?php

namespace App\Services;

use RuntimeException;

class UnavailableDrugInteractionProvider implements DrugInteractionProvider
{
    public function check(array $ingredients, array $history = []): array
    {
        throw new RuntimeException('No licensed drug interaction provider is configured.');
    }
}
