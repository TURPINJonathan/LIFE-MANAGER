<?php

declare(strict_types=1);

namespace App\Module\Account\Exception;

final class SubAccountNotFoundException extends \RuntimeException
{
    public function __construct()
    {
        parent::__construct('Sous-compte introuvable.');
    }
}
