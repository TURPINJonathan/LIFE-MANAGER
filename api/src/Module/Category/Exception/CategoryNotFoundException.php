<?php

declare(strict_types=1);

namespace App\Module\Category\Exception;

final class CategoryNotFoundException extends \RuntimeException
{
    public function __construct()
    {
        parent::__construct('Catégorie introuvable.');
    }
}
