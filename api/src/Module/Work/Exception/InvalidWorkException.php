<?php

declare(strict_types=1);

namespace App\Module\Work\Exception;

final class InvalidWorkException extends \RuntimeException
{
    public function __construct(string $message)
    {
        parent::__construct($message);
    }
}
