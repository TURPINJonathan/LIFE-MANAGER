<?php

declare(strict_types=1);

namespace App\Module\Work\Exception;

final class WorkDocumentNotFoundException extends \RuntimeException
{
    public function __construct(string $message = 'Document introuvable.')
    {
        parent::__construct($message);
    }
}
