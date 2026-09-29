<?php

declare(strict_types=1);

namespace App\Module\Category\Exception;

final class CategoryInUseException extends \RuntimeException
{
    public function __construct()
    {
        parent::__construct('Cette catégorie est utilisée par des transactions.');
    }
}
