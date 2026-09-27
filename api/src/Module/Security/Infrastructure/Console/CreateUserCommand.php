<?php

declare(strict_types=1);

namespace App\Module\Security\Infrastructure\Console;

use App\Module\Security\Contract\Service\IUserProvisioner;
use App\Module\Security\Domain\Enum\UserRole;
use App\Module\Security\Exception\DuplicateUserEmailException;
use App\Module\Security\Exception\InvalidUserPasswordException;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(
    name: 'security:user:create',
    description: 'Crée un utilisateur Life Manager.',
)]
final class CreateUserCommand extends Command
{
    public function __construct(private readonly IUserProvisioner $users)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('email', null, InputOption::VALUE_REQUIRED, 'Adresse e-mail')
            ->addOption('password', null, InputOption::VALUE_REQUIRED, 'Mot de passe en clair')
            ->addOption('first-name', null, InputOption::VALUE_REQUIRED, 'Prénom')
            ->addOption('last-name', null, InputOption::VALUE_REQUIRED, 'Nom')
            ->addOption('admin', null, InputOption::VALUE_NONE, 'Ajoute le rôle ROLE_ADMIN');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $email = $input->getOption('email');
        $password = $input->getOption('password');
        $firstName = $input->getOption('first-name');
        $lastName = $input->getOption('last-name');

        if (!\is_string($email) || !\is_string($password) || !\is_string($firstName) || !\is_string($lastName)) {
            $output->writeln('<error>email, password, first-name et last-name sont obligatoires.</error>');

            return Command::FAILURE;
        }

        $roles = [UserRole::User];
        if (true === $input->getOption('admin')) {
            $roles[] = UserRole::Admin;
        }

        try {
            $user = $this->users->create($email, $password, $firstName, $lastName, $roles);
        } catch (InvalidUserPasswordException|DuplicateUserEmailException $exception) {
            $output->writeln('<error>'.$exception->getMessage().'</error>');

            return Command::FAILURE;
        }

        $output->writeln(\sprintf('Utilisateur créé : %s (%s)', $user->getEmail(), $user->getId()));

        return Command::SUCCESS;
    }
}
