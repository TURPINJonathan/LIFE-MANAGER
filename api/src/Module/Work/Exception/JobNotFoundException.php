<?php

declare(strict_types=1);

namespace App\Module\Work\Exception;

final class JobNotFoundException extends \RuntimeException
{
    public function __construct(string $message = 'Emploi introuvable.')
    {
        parent::__construct($message);
    }
}
