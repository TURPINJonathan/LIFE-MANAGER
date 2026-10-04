<?php

declare(strict_types=1);

namespace App\Module\Work\Exception;

final class TimeEntryNotFoundException extends \RuntimeException
{
    public function __construct(string $message = 'Pointage introuvable.')
    {
        parent::__construct($message);
    }
}
