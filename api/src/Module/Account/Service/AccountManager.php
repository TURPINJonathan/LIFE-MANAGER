<?php

declare(strict_types=1);

namespace App\Module\Account\Service;

use App\Module\Account\Domain\Entity\Account;
use App\Module\Account\Domain\Entity\SubAccount;
use App\Module\Account\Exception\AccountNotFoundException;
use App\Module\Account\Exception\SubAccountNotFoundException;
use App\Module\Account\Repository\AccountRepository;
use App\Module\Account\Repository\SubAccountRepository;
use App\Module\Security\Contract\Service\ICurrentUserAccessor;
use Symfony\Component\Uid\Uuid;

final class AccountManager
{
    public function __construct(
        private readonly AccountRepository $accounts,
        private readonly SubAccountRepository $subAccounts,
        private readonly BalanceCalculator $balances,
        private readonly ICurrentUserAccessor $users,
    ) {
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listAccounts(bool $includeArchived = false): array
    {
        $owner = $this->users->requireUser();
        $result = [];
        foreach ($this->accounts->listForOwner($owner, $includeArchived) as $account) {
            $result[] = $this->serializeAccount($account, !$includeArchived);
        }

        return $result;
    }

    /**
     * @return array<string, mixed>
     */
    public function getAccount(string $id): array
    {
        return $this->serializeAccount($this->requireAccount($id), true);
    }

    /**
     * @param array{name: string, notes?: ?string, position?: int} $data
     *
     * @return array<string, mixed>
     */
    public function createAccount(array $data): array
    {
        $account = new Account(
            $this->users->requireUser(),
            $data['name'],
            $data['notes'] ?? null,
            $data['position'] ?? 0,
        );
        $this->accounts->save($account);

        return $this->serializeAccount($account, true);
    }

    /**
     * @param array{name?: string, notes?: ?string, position?: int} $data
     *
     * @return array<string, mixed>
     */
    public function updateAccount(string $id, array $data): array
    {
        $account = $this->requireAccount($id);
        if (isset($data['name'])) {
            $account->setName($data['name']);
        }
        if (\array_key_exists('notes', $data)) {
            $account->setNotes($data['notes']);
        }
        if (isset($data['position'])) {
            $account->setPosition($data['position']);
        }
        $this->accounts->save($account);

        return $this->serializeAccount($account, true);
    }

    /**
     * @return array<string, mixed>
     */
    public function archiveAccount(string $id): array
    {
        $account = $this->requireAccount($id);
        $account->archive();
        foreach ($this->subAccounts->listForAccount($account) as $sub) {
            if (!$sub->isArchived()) {
                $sub->archive();
                $this->subAccounts->save($sub);
            }
        }
        $this->accounts->save($account);

        return $this->serializeAccount($account, false);
    }

    /**
     * @param array{name: string, icon: string, color: string, openingBalanceCents?: int, position?: int} $data
     *
     * @return array<string, mixed>
     */
    public function createSubAccount(string $accountId, array $data): array
    {
        $account = $this->requireAccount($accountId);
        $sub = new SubAccount(
            $account,
            $data['name'],
            $data['icon'],
            $data['color'],
            $data['openingBalanceCents'] ?? 0,
            $data['position'] ?? 0,
        );
        $this->subAccounts->save($sub);

        return $this->serializeSubAccount($sub);
    }

    /**
     * @param array{name?: string, icon?: string, color?: string, openingBalanceCents?: int, position?: int} $data
     *
     * @return array<string, mixed>
     */
    public function updateSubAccount(string $id, array $data): array
    {
        $sub = $this->requireSubAccount($id);
        if (isset($data['name'])) {
            $sub->setName($data['name']);
        }
        if (isset($data['icon'])) {
            $sub->setIcon($data['icon']);
        }
        if (isset($data['color'])) {
            $sub->setColor($data['color']);
        }
        if (isset($data['openingBalanceCents'])) {
            $sub->setOpeningBalanceCents($data['openingBalanceCents']);
        }
        if (isset($data['position'])) {
            $sub->setPosition($data['position']);
        }
        $this->subAccounts->save($sub);

        return $this->serializeSubAccount($sub);
    }

    /**
     * @return array<string, mixed>
     */
    public function archiveSubAccount(string $id): array
    {
        $sub = $this->requireSubAccount($id);
        $sub->archive();
        $this->subAccounts->save($sub);

        return $this->serializeSubAccount($sub);
    }

    /**
     * @return array<string, mixed>
     */
    public function getSubAccount(string $id): array
    {
        return $this->serializeSubAccount($this->requireSubAccount($id));
    }

    public function requireSubAccountEntity(string $id): SubAccount
    {
        return $this->requireSubAccount($id);
    }

    /**
     * @return list<SubAccount>
     */
    public function listActiveSubAccountEntities(): array
    {
        $owner = $this->users->requireUser();
        $subs = [];
        foreach ($this->accounts->listForOwner($owner, false) as $account) {
            foreach ($this->subAccounts->listForAccount($account) as $sub) {
                if (!$sub->isArchived()) {
                    $subs[] = $sub;
                }
            }
        }

        return $subs;
    }

    private function requireAccount(string $id): Account
    {
        $account = $this->accounts->findOwned(Uuid::fromString($id), $this->users->requireUser());
        if (null === $account || $account->isArchived()) {
            throw new AccountNotFoundException();
        }

        return $account;
    }

    private function requireSubAccount(string $id): SubAccount
    {
        $sub = $this->subAccounts->findOwned(Uuid::fromString($id), $this->users->requireUser());
        if (null === $sub || $sub->isArchived() || $sub->getAccount()->isArchived()) {
            throw new SubAccountNotFoundException();
        }

        return $sub;
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeAccount(Account $account, bool $withSubs): array
    {
        $payload = [
            'id' => (string) $account->getId(),
            'name' => $account->getName(),
            'notes' => $account->getNotes(),
            'position' => $account->getPosition(),
            'archivedAt' => $account->getArchivedAt()?->format(\DateTimeInterface::ATOM),
            'createdAt' => $account->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];

        if ($withSubs) {
            $subs = [];
            foreach ($this->subAccounts->listForAccount($account) as $sub) {
                $subs[] = $this->serializeSubAccount($sub);
            }
            $payload['subAccounts'] = $subs;
        }

        return $payload;
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeSubAccount(SubAccount $sub): array
    {
        return [
            'id' => (string) $sub->getId(),
            'accountId' => (string) $sub->getAccount()->getId(),
            'name' => $sub->getName(),
            'icon' => $sub->getIcon(),
            'color' => $sub->getColor(),
            'openingBalanceCents' => $sub->getOpeningBalanceCents(),
            'balanceCents' => $this->balances->currentBalanceCents($sub),
            'provisionalBalanceCents' => $this->balances->provisionalBalanceCents($sub),
            'position' => $sub->getPosition(),
            'archivedAt' => $sub->getArchivedAt()?->format(\DateTimeInterface::ATOM),
            'createdAt' => $sub->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
