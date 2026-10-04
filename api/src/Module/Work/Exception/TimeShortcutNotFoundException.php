<?php

declare(strict_types=1);

namespace App\Module\Work\Exception;

final class TimeShortcutNotFoundException extends \RuntimeException
{
    public function __construct(string $message = 'Raccourci de pointage introuvable.')
    {
        parent::__construct($message);
    }
}
