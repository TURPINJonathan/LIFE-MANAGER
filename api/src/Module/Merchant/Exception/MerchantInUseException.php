<?php

declare(strict_types=1);

namespace App\Module\Merchant\Exception;

final class MerchantInUseException extends \RuntimeException
{
    public function __construct()
    {
        parent::__construct('Cette enseigne est utilisée par des transactions.');
    }
}
