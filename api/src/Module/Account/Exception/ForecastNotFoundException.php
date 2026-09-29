<?php

declare(strict_types=1);

namespace App\Module\Account\Exception;

final class ForecastNotFoundException extends \RuntimeException
{
    public function __construct(string $message = 'Budget mensuel introuvable.')
    {
        parent::__construct($message);
    }
}
