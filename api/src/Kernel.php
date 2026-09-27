<?php

declare(strict_types=1);

namespace App;

use Symfony\Bundle\FrameworkBundle\Kernel\MicroKernelTrait;
use Symfony\Component\HttpKernel\Kernel as BaseKernel;

class Kernel extends BaseKernel
{
    use MicroKernelTrait;

    /**
     * Restricts APP_ENV. The method replaces the private one from the kernel trait,
     * which PHPStan does not see as a call.
     *
     * @return list<string>
     */
    private function getAllowedEnvs(): array // @phpstan-ignore method.unused
    {
        return ['prod', 'dev', 'test'];
    }
}
