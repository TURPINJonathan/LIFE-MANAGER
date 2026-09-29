<?php

declare(strict_types=1);

namespace App\Module\Merchant\Exception;

final class MerchantNotFoundException extends \RuntimeException
{
    public function __construct()
    {
        parent::__construct('Enseigne introuvable.');
    }
}
