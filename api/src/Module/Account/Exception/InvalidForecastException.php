<?php

declare(strict_types=1);

namespace App\Module\Account\Exception;

final class InvalidForecastException extends \RuntimeException
{
    public function __construct(string $message)
    {
        parent::__construct($message);
    }
}
