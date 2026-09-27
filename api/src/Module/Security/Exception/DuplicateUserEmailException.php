<?php

declare(strict_types=1);

namespace App\Module\Security\Exception;

final class DuplicateUserEmailException extends \RuntimeException
{
    public function __construct(string $email)
    {
        parent::__construct(\sprintf('Un compte existe déjà pour %s.', $email));
    }
}
