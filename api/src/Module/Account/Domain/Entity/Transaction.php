<?php

declare(strict_types=1);

namespace App\Module\Account\Domain\Entity;

use App\Module\Account\Domain\Enum\PaymentMethod;
use App\Module\Account\Repository\TransactionRepository;
use App\Module\Category\Domain\Entity\Category;
use App\Module\Merchant\Domain\Entity\Merchant;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: TransactionRepository::class)]
#[ORM\Table(name: 'ledger_transaction')]
#[ORM\Index(name: 'idx_ledger_tx_sub_account', columns: ['sub_account_id'])]
#[ORM\Index(name: 'idx_ledger_tx_effective', columns: ['sub_account_id', 'effective_date', 'operation_date', 'id'])]
#[ORM\Index(name: 'idx_ledger_tx_merchant', columns: ['merchant_id'])]
class Transaction
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: SubAccount::class)]
    #[ORM\JoinColumn(name: 'sub_account_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private SubAccount $subAccount;

    #[ORM\ManyToOne(targetEntity: Category::class)]
    #[ORM\JoinColumn(name: 'category_id', referencedColumnName: 'id', nullable: false, onDelete: 'RESTRICT')]
    private Category $category;

    #[ORM\ManyToOne(targetEntity: Merchant::class)]
    #[ORM\JoinColumn(name: 'merchant_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Merchant $merchant = null;

    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $operationDate;

    #[ORM\Column(type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $effectiveDate;

    #[ORM\Column(length: 32, enumType: PaymentMethod::class)]
    private PaymentMethod $paymentMethod;

    #[ORM\Column(length: 64, nullable: true)]
    private ?string $checkNumber = null;

    #[ORM\Column(length: 255)]
    private string $designation;

    #[ORM\Column(type: Types::INTEGER)]
    private int $amountCents;

    #[ORM\Column(length: 512, nullable: true)]
    private ?string $attachmentPath = null;

    #[ORM\Column(length: 127, nullable: true)]
    private ?string $attachmentMime = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $attachmentOriginalName = null;

    #[ORM\Column(type: Types::INTEGER, nullable: true)]
    private ?int $attachmentSize = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $updatedAt;

    public function __construct(
        SubAccount $subAccount,
        Category $category,
        \DateTimeImmutable $operationDate,
        ?\DateTimeImmutable $effectiveDate,
        PaymentMethod $paymentMethod,
        string $designation,
        int $amountCents,
        ?string $checkNumber = null,
        ?Merchant $merchant = null,
    ) {
        $this->id = Uuid::v7();
        $this->subAccount = $subAccount;
        $this->category = $category;
        $this->merchant = $merchant;
        $this->operationDate = $operationDate;
        $this->effectiveDate = $effectiveDate;
        $this->paymentMethod = $paymentMethod;
        $this->designation = trim($designation);
        $this->amountCents = $amountCents;
        $this->checkNumber = null !== $checkNumber && '' !== trim($checkNumber) ? trim($checkNumber) : null;
        $now = new \DateTimeImmutable();
        $this->createdAt = $now;
        $this->updatedAt = $now;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getSubAccount(): SubAccount
    {
        return $this->subAccount;
    }

    public function getCategory(): Category
    {
        return $this->category;
    }

    public function setCategory(Category $category): void
    {
        $this->category = $category;
        $this->touch();
    }

    public function getMerchant(): ?Merchant
    {
        return $this->merchant;
    }

    public function setMerchant(?Merchant $merchant): void
    {
        $this->merchant = $merchant;
        $this->touch();
    }

    public function getAttachmentPath(): ?string
    {
        return $this->attachmentPath;
    }

    public function getAttachmentMime(): ?string
    {
        return $this->attachmentMime;
    }

    public function getAttachmentOriginalName(): ?string
    {
        return $this->attachmentOriginalName;
    }

    public function getAttachmentSize(): ?int
    {
        return $this->attachmentSize;
    }

    public function hasAttachment(): bool
    {
        return null !== $this->attachmentPath && '' !== $this->attachmentPath;
    }

    public function setAttachment(
        ?string $path,
        ?string $mime,
        ?string $originalName,
        ?int $size,
    ): void {
        $this->attachmentPath = null !== $path && '' !== trim($path) ? trim($path) : null;
        $this->attachmentMime = null !== $mime && '' !== trim($mime) ? trim($mime) : null;
        $this->attachmentOriginalName = null !== $originalName && '' !== trim($originalName) ? trim($originalName) : null;
        $this->attachmentSize = $size;
        $this->touch();
    }

    public function clearAttachment(): void
    {
        $this->setAttachment(null, null, null, null);
    }

    public function getOperationDate(): \DateTimeImmutable
    {
        return $this->operationDate;
    }

    public function setOperationDate(\DateTimeImmutable $operationDate): void
    {
        $this->operationDate = $operationDate;
        $this->touch();
    }

    public function getEffectiveDate(): ?\DateTimeImmutable
    {
        return $this->effectiveDate;
    }

    public function setEffectiveDate(?\DateTimeImmutable $effectiveDate): void
    {
        $this->effectiveDate = $effectiveDate;
        $this->touch();
    }

    public function getPaymentMethod(): PaymentMethod
    {
        return $this->paymentMethod;
    }

    public function setPaymentMethod(PaymentMethod $paymentMethod): void
    {
        $this->paymentMethod = $paymentMethod;
        $this->touch();
    }

    public function getCheckNumber(): ?string
    {
        return $this->checkNumber;
    }

    public function setCheckNumber(?string $checkNumber): void
    {
        $this->checkNumber = null !== $checkNumber && '' !== trim($checkNumber) ? trim($checkNumber) : null;
        $this->touch();
    }

    public function getDesignation(): string
    {
        return $this->designation;
    }

    public function setDesignation(string $designation): void
    {
        $this->designation = trim($designation);
        $this->touch();
    }

    public function getAmountCents(): int
    {
        return $this->amountCents;
    }

    public function setAmountCents(int $amountCents): void
    {
        $this->amountCents = $amountCents;
        $this->touch();
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }

    private function touch(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }
}
