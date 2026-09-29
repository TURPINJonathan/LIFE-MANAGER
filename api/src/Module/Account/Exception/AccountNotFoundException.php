<?php

declare(strict_types=1);

namespace App\Module\Account\Exception;

final class AccountNotFoundException extends \RuntimeException
{
    public function __construct()
    {
        parent::__construct('Compte introuvable.');
    }
}
