<?php

namespace App\Services;

interface DrugInteractionProvider
{
    public function check(array $ingredients, array $history = []): array;
}
