<?php

declare(strict_types=1);

namespace App\Module\Work\Exception;

final class WorkPlanEntryNotFoundException extends \RuntimeException
{
    public function __construct(string $message = 'Jour planifié introuvable.')
    {
        parent::__construct($message);
    }
}
