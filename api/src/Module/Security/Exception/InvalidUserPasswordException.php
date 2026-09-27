<?php

declare(strict_types=1);

namespace App\Module\Security\Exception;

final class InvalidUserPasswordException extends \InvalidArgumentException
{
    public function __construct()
    {
        parent::__construct('Le mot de passe doit contenir au moins 12 caractères, une lettre et un chiffre.');
    }
}
