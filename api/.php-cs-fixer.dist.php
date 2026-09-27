<?php

declare(strict_types=1);

$finder = PhpCsFixer\Finder::create()
    ->in(__DIR__)
    ->exclude('var')
    ->exclude('vendor')
    ->notPath('config/reference.php')
    ->name('*.php');

return (new PhpCsFixer\Config())
    ->setRiskyAllowed(true)
    ->setRules([
        '@Symfony' => true,
        '@Symfony:risky' => true,
        'phpdoc_to_comment' => false,
        'declare_strict_types' => true,
        'binary_operator_spaces' => [
            'operators' => [
                '=>' => 'align_single_space_minimal',
            ],
        ],
    ])
    ->setFinder($finder);
