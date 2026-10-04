<?php

declare(strict_types=1);

namespace App\Module\Work\Exception;

final class WorkerNotFoundException extends \RuntimeException
{
    public function __construct(string $message = 'Travailleur introuvable.')
    {
        parent::__construct($message);
    }
}
