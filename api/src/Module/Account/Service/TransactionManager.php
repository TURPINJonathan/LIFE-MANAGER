<?php

declare(strict_types=1);

namespace App\Module\Account\Service;

use App\Module\Account\Domain\Entity\Transaction;
use App\Module\Account\Domain\Enum\PaymentMethod;
use App\Module\Account\Exception\InvalidTransactionException;
use App\Module\Account\Exception\TransactionNotFoundException;
use App\Module\Account\Repository\TransactionRepository;
use App\Module\Category\Service\CategoryManager;
use App\Module\Merchant\Domain\Entity\Merchant;
use App\Module\Merchant\Service\MerchantManager;
use App\Module\Security\Contract\Service\ICurrentUserAccessor;
use App\Shared\Upload\LocalUploadStorage;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\Uid\Uuid;

final class TransactionManager
{
    public function __construct(
        private readonly TransactionRepository $transactions,
        private readonly AccountManager $accounts,
        private readonly CategoryManager $categories,
        private readonly MerchantManager $merchants,
        private readonly BalanceCalculator $balances,
        private readonly ForecastManager $forecasts,
        private readonly LocalUploadStorage $uploads,
        private readonly ICurrentUserAccessor $users,
    ) {
    }

    /**
     * @return array{subAccount: array<string, mixed>, openingBalanceCents: int, transactions: list<array<string, mixed>>}
     */
    public function listForSubAccount(string $subAccountId): array
    {
        $sub = $this->accounts->requireSubAccountEntity($subAccountId);
        $rows = [];
        foreach ($this->balances->withRunningBalances($sub) as $row) {
            $rows[] = $this->serialize($row['transaction'], $row['balanceAfterCents']);
        }

        return [
            'subAccount' => $this->accounts->getSubAccount($subAccountId),
            'openingBalanceCents' => $sub->getOpeningBalanceCents(),
            'transactions' => $rows,
        ];
    }

    /**
     * @param array{
     *   categoryId: string,
     *   merchantId?: ?string,
     *   operationDate: string,
     *   effectiveDate?: ?string,
     *   paymentMethod: string,
     *   checkNumber?: ?string,
     *   designation: string,
     *   amountCents: int,
     *   flow?: ?string
     * } $data
     *
     * @return array<string, mixed>
     */
    public function create(string $subAccountId, array $data): array
    {
        $sub = $this->accounts->requireSubAccountEntity($subAccountId);
        $category = $this->categories->requireOwnedEntity($data['categoryId']);
        $merchant = $this->resolveMerchant($data['merchantId'] ?? null);
        $method = PaymentMethod::from($data['paymentMethod']);
        $signed = AmountFromCategory::signedCents($category, $data['amountCents'], $data['flow'] ?? null);
        $this->assertPayment($method, $data['checkNumber'] ?? null);

        $effective = null;
        if (isset($data['effectiveDate']) && \is_string($data['effectiveDate']) && '' !== trim($data['effectiveDate'])) {
            $effective = new \DateTimeImmutable($data['effectiveDate']);
        }

        $tx = new Transaction(
            $sub,
            $category,
            new \DateTimeImmutable($data['operationDate']),
            $effective,
            $method,
            $data['designation'],
            $signed,
            $data['checkNumber'] ?? null,
            $merchant,
        );
        $this->transactions->save($tx);

        return $this->serializeAfterWrite($tx);
    }

    /**
     * @param array{
     *   categoryId?: string,
     *   merchantId?: ?string,
     *   operationDate?: string,
     *   effectiveDate?: ?string,
     *   paymentMethod?: string,
     *   checkNumber?: ?string,
     *   designation?: string,
     *   amountCents?: int,
     *   flow?: ?string
     * } $data
     *
     * @return array<string, mixed>
     */
    public function update(string $id, array $data): array
    {
        $tx = $this->requireOwned($id);
        if (isset($data['categoryId'])) {
            $tx->setCategory($this->categories->requireOwnedEntity($data['categoryId']));
        }
        if (\array_key_exists('merchantId', $data)) {
            $tx->setMerchant($this->resolveMerchant($data['merchantId']));
        }
        if (isset($data['operationDate'])) {
            $tx->setOperationDate(new \DateTimeImmutable($data['operationDate']));
        }
        if (\array_key_exists('effectiveDate', $data)) {
            $raw = $data['effectiveDate'];
            $tx->setEffectiveDate(
                \is_string($raw) && '' !== trim($raw) ? new \DateTimeImmutable($raw) : null,
            );
        }
        if (isset($data['paymentMethod'])) {
            $tx->setPaymentMethod(PaymentMethod::from($data['paymentMethod']));
        }
        if (\array_key_exists('checkNumber', $data)) {
            $tx->setCheckNumber($data['checkNumber']);
        }
        if (isset($data['designation'])) {
            $tx->setDesignation($data['designation']);
        }

        $absolute = $data['amountCents'] ?? abs($tx->getAmountCents());
        $flow = $data['flow'] ?? $this->inferFlow($tx);
        $tx->setAmountCents(AmountFromCategory::signedCents($tx->getCategory(), $absolute, $flow));

        $this->assertPayment($tx->getPaymentMethod(), $tx->getCheckNumber());
        $this->transactions->save($tx);

        return $this->serializeAfterWrite($tx);
    }

    public function delete(string $id): void
    {
        $tx = $this->requireOwned($id);
        if ($tx->hasAttachment()) {
            $this->uploads->delete($tx->getAttachmentPath());
        }
        $this->transactions->remove($tx);
    }

    /**
     * @return array<string, mixed>
     */
    public function uploadAttachment(string $id, UploadedFile $file): array
    {
        $tx = $this->requireOwned($id);
        $this->uploads->assertAttachmentMime($file);
        $mime = $file->getMimeType();
        $originalName = $file->getClientOriginalName();
        $size = $file->getSize() ?: null;
        $ownerId = (string) $this->users->requireUser()->getId();
        $relative = $this->uploads->store($file, 'transactions/'.$ownerId);
        if ($tx->hasAttachment()) {
            $this->uploads->delete($tx->getAttachmentPath());
        }
        $tx->setAttachment($relative, $mime, $originalName, $size);
        $this->transactions->save($tx);

        return $this->serializeWithBalance($tx);
    }

    public function streamAttachment(string $id): Response
    {
        $tx = $this->requireOwned($id);
        if (!$tx->hasAttachment()) {
            throw new TransactionNotFoundException();
        }
        $relative = (string) $tx->getAttachmentPath();
        $filename = $tx->getAttachmentOriginalName() ?: basename($relative, '.gz');
        try {
            return $this->uploads->createFileResponse(
                $relative,
                $tx->getAttachmentMime(),
                $filename,
                ResponseHeaderBag::DISPOSITION_INLINE,
            );
        } catch (\InvalidArgumentException) {
            throw new TransactionNotFoundException();
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function clearAttachment(string $id): array
    {
        $tx = $this->requireOwned($id);
        if ($tx->hasAttachment()) {
            $this->uploads->delete($tx->getAttachmentPath());
            $tx->clearAttachment();
            $this->transactions->save($tx);
        }

        return $this->serializeWithBalance($tx);
    }

    private function resolveMerchant(?string $merchantId): ?Merchant
    {
        if (null === $merchantId || '' === trim($merchantId)) {
            return null;
        }

        return $this->merchants->requireOwnedEntity($merchantId);
    }

    private function requireOwned(string $id): Transaction
    {
        $tx = $this->transactions->findOwned(Uuid::fromString($id), $this->users->requireUser());
        if (null === $tx) {
            throw new TransactionNotFoundException();
        }

        return $tx;
    }

    private function inferFlow(Transaction $tx): string
    {
        return $tx->getAmountCents() >= 0 ? 'credit' : 'debit';
    }

    private function assertPayment(PaymentMethod $method, ?string $checkNumber): void
    {
        if (PaymentMethod::Check === $method && (null === $checkNumber || '' === trim($checkNumber))) {
            throw new InvalidTransactionException('Le numéro de chèque est obligatoire.');
        }
        if (PaymentMethod::Check !== $method && null !== $checkNumber && '' !== trim($checkNumber)) {
            throw new InvalidTransactionException('Le numéro de chèque n’est autorisé que pour un chèque.');
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeAfterWrite(Transaction $tx): array
    {
        $ensure = $this->forecasts->ensureCategoryLineForTransaction($tx);
        $payload = $this->serializeWithBalance($tx);
        $payload['forecastCategoryAdded'] = $ensure['added'];
        $payload['forecastCategoryName'] = $ensure['categoryName'];
        $payload['forecastYearMonth'] = $ensure['yearMonth'];

        return $payload;
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeWithBalance(Transaction $tx): array
    {
        $match = null;
        foreach ($this->balances->withRunningBalances($tx->getSubAccount()) as $row) {
            if ($row['transaction']->getId()->equals($tx->getId())) {
                $match = $row['balanceAfterCents'];
                break;
            }
        }

        return $this->serialize($tx, $match);
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(Transaction $tx, ?int $balanceAfterCents): array
    {
        $category = $tx->getCategory();
        $merchant = $tx->getMerchant();
        $id = (string) $tx->getId();
        $hasAttachment = $tx->hasAttachment();
        $merchantPayload = null;
        if (null !== $merchant) {
            $merchantId = (string) $merchant->getId();
            $merchantHasImage = $merchant->hasImage();
            $merchantPayload = [
                'id' => $merchantId,
                'name' => $merchant->getName(),
                'color' => $merchant->getColor(),
                'icon' => $merchant->getIcon(),
                'hasImage' => $merchantHasImage,
                'imageUrl' => $merchantHasImage ? '/api/merchants/'.$merchantId.'/image' : null,
            ];
        }

        return [
            'id' => $id,
            'subAccountId' => (string) $tx->getSubAccount()->getId(),
            'category' => [
                'id' => (string) $category->getId(),
                'name' => $category->getName(),
                'icon' => $category->getIcon(),
                'color' => $category->getColor(),
                'kind' => $category->getKind()->value,
            ],
            'merchant' => $merchantPayload,
            'operationDate' => $tx->getOperationDate()->format('Y-m-d'),
            'effectiveDate' => $tx->getEffectiveDate()?->format('Y-m-d'),
            'paymentMethod' => $tx->getPaymentMethod()->value,
            'checkNumber' => $tx->getCheckNumber(),
            'designation' => $tx->getDesignation(),
            'amountCents' => $tx->getAmountCents(),
            'hasAttachment' => $hasAttachment,
            'attachmentUrl' => $hasAttachment ? '/api/transactions/'.$id.'/attachment' : null,
            'attachmentOriginalName' => $tx->getAttachmentOriginalName(),
            'balanceAfterCents' => $balanceAfterCents,
            'createdAt' => $tx->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'updatedAt' => $tx->getUpdatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
