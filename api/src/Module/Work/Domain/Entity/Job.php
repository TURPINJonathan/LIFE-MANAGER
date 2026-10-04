<?php

declare(strict_types=1);

namespace App\Module\Work\Domain\Entity;

use App\Module\Work\Domain\Enum\ContractType;
use App\Module\Work\Domain\Enum\JobStatus;
use App\Module\Work\Domain\Enum\NetEstimateMode;
use App\Module\Work\Repository\JobRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: JobRepository::class)]
#[ORM\Table(name: 'work_job')]
#[ORM\Index(name: 'idx_work_job_worker', columns: ['worker_id'])]
class Job
{
    public const DEFAULT_WEEKLY_MINUTES = 2100;
    public const DEFAULT_WORK_DAYS_MASK = 31; // lun–ven
    public const DEFAULT_OVERTIME_RATE_BPS = 12500;
    public const DEFAULT_CONTRIBUTION_RATE_BPS = 2200;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Worker::class, inversedBy: 'jobs')]
    #[ORM\JoinColumn(name: 'worker_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Worker $worker;

    #[ORM\Column(length: 160)]
    private string $title;

    #[ORM\Column(length: 160)]
    private string $companyName;

    #[ORM\Column(length: 14, nullable: true)]
    private ?string $companySiret = null;

    #[ORM\Column(length: 32, enumType: ContractType::class)]
    private ContractType $contractType;

    #[ORM\Column(length: 32, enumType: JobStatus::class)]
    private JobStatus $status;

    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $startDate;

    #[ORM\Column(type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $endDate = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(length: 32, nullable: true)]
    private ?string $color = null;

    #[ORM\Column(length: 64, nullable: true)]
    private ?string $icon = null;

    #[ORM\Column(type: Types::INTEGER)]
    private int $position;

    #[ORM\Column(type: Types::INTEGER)]
    private int $contractWeeklyMinutes;

    #[ORM\Column(type: Types::BOOLEAN)]
    private bool $timeTrackingEnabled;

    #[ORM\Column(type: Types::SMALLINT)]
    private int $weekStartsOn;

    #[ORM\Column(type: Types::SMALLINT)]
    private int $workDaysMask;

    /**
     * Semaine type : 7 jours (index 0 = lundi … 6 = dimanche).
     *
     * @var list<array{enabled: bool, segments: list<array{start: string, end: string}>, pauseMinutes: int}>|null
     */
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $weekTemplate = null;

    #[ORM\Column(type: Types::INTEGER)]
    private int $grossHourlyRateCents;

    #[ORM\Column(type: Types::INTEGER)]
    private int $overtimeRateBps;

    #[ORM\Column(name: 'overtime_rate2bps', type: Types::INTEGER, nullable: true)]
    private ?int $overtimeRate2Bps = null;

    #[ORM\Column(type: Types::INTEGER, nullable: true)]
    private ?int $overtimeThresholdWeeklyMinutes = null;

    #[ORM\Column(type: Types::INTEGER)]
    private int $employeeContributionRateBps;

    #[ORM\Column(type: Types::INTEGER)]
    private int $pasRateBps;

    #[ORM\Column(length: 32, enumType: NetEstimateMode::class)]
    private NetEstimateMode $netEstimateMode;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $archivedAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    public function __construct(
        Worker $worker,
        string $title,
        string $companyName,
        \DateTimeImmutable $startDate,
        int $grossHourlyRateCents,
        ContractType $contractType = ContractType::Cdi,
        JobStatus $status = JobStatus::NonCadre,
        int $contractWeeklyMinutes = self::DEFAULT_WEEKLY_MINUTES,
        int $position = 0,
    ) {
        $this->id = Uuid::v7();
        $this->worker = $worker;
        $this->title = trim($title);
        $this->companyName = trim($companyName);
        $this->startDate = $startDate;
        $this->grossHourlyRateCents = $grossHourlyRateCents;
        $this->contractType = $contractType;
        $this->status = $status;
        $this->contractWeeklyMinutes = $contractWeeklyMinutes;
        $this->position = $position;
        $this->timeTrackingEnabled = true;
        $this->weekStartsOn = 1;
        $this->workDaysMask = self::DEFAULT_WORK_DAYS_MASK;
        $this->overtimeRateBps = self::DEFAULT_OVERTIME_RATE_BPS;
        $this->employeeContributionRateBps = self::DEFAULT_CONTRIBUTION_RATE_BPS;
        $this->pasRateBps = 0;
        $this->netEstimateMode = NetEstimateMode::Params;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getWorker(): Worker
    {
        return $this->worker;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function setTitle(string $title): void
    {
        $this->title = trim($title);
    }

    public function getCompanyName(): string
    {
        return $this->companyName;
    }

    public function setCompanyName(string $companyName): void
    {
        $this->companyName = trim($companyName);
    }

    public function getCompanySiret(): ?string
    {
        return $this->companySiret;
    }

    public function setCompanySiret(?string $companySiret): void
    {
        $this->companySiret = null !== $companySiret && '' !== trim($companySiret) ? trim($companySiret) : null;
    }

    public function getContractType(): ContractType
    {
        return $this->contractType;
    }

    public function setContractType(ContractType $contractType): void
    {
        $this->contractType = $contractType;
    }

    public function getStatus(): JobStatus
    {
        return $this->status;
    }

    public function setStatus(JobStatus $status): void
    {
        $this->status = $status;
    }

    public function getStartDate(): \DateTimeImmutable
    {
        return $this->startDate;
    }

    public function setStartDate(\DateTimeImmutable $startDate): void
    {
        $this->startDate = $startDate;
    }

    public function getEndDate(): ?\DateTimeImmutable
    {
        return $this->endDate;
    }

    public function setEndDate(?\DateTimeImmutable $endDate): void
    {
        $this->endDate = $endDate;
    }

    public function getNotes(): ?string
    {
        return $this->notes;
    }

    public function setNotes(?string $notes): void
    {
        $this->notes = null !== $notes && '' !== trim($notes) ? trim($notes) : null;
    }

    public function getColor(): ?string
    {
        return $this->color;
    }

    public function setColor(?string $color): void
    {
        $this->color = null !== $color && '' !== trim($color) ? strtoupper(trim($color)) : null;
    }

    public function getIcon(): ?string
    {
        return $this->icon;
    }

    public function setIcon(?string $icon): void
    {
        $this->icon = null !== $icon && '' !== trim($icon) ? trim($icon) : null;
    }

    public function getPosition(): int
    {
        return $this->position;
    }

    public function setPosition(int $position): void
    {
        $this->position = $position;
    }

    public function getContractWeeklyMinutes(): int
    {
        return $this->contractWeeklyMinutes;
    }

    public function setContractWeeklyMinutes(int $contractWeeklyMinutes): void
    {
        $this->contractWeeklyMinutes = $contractWeeklyMinutes;
    }

    public function isTimeTrackingEnabled(): bool
    {
        return $this->timeTrackingEnabled;
    }

    public function setTimeTrackingEnabled(bool $timeTrackingEnabled): void
    {
        $this->timeTrackingEnabled = $timeTrackingEnabled;
    }

    public function getWeekStartsOn(): int
    {
        return $this->weekStartsOn;
    }

    public function setWeekStartsOn(int $weekStartsOn): void
    {
        $this->weekStartsOn = $weekStartsOn;
    }

    public function getWorkDaysMask(): int
    {
        return $this->workDaysMask;
    }

    public function setWorkDaysMask(int $workDaysMask): void
    {
        $this->workDaysMask = $workDaysMask;
    }

    /**
     * @return list<array{enabled: bool, segments: list<array{start: string, end: string}>, pauseMinutes: int}>|null
     */
    public function getWeekTemplate(): ?array
    {
        return $this->weekTemplate;
    }

    /**
     * @param list<array{enabled: bool, segments: list<array{start: string, end: string}>, pauseMinutes: int}>|null $weekTemplate
     */
    public function setWeekTemplate(?array $weekTemplate): void
    {
        $this->weekTemplate = $weekTemplate;
    }

    public function getGrossHourlyRateCents(): int
    {
        return $this->grossHourlyRateCents;
    }

    public function setGrossHourlyRateCents(int $grossHourlyRateCents): void
    {
        $this->grossHourlyRateCents = $grossHourlyRateCents;
    }

    public function getOvertimeRateBps(): int
    {
        return $this->overtimeRateBps;
    }

    public function setOvertimeRateBps(int $overtimeRateBps): void
    {
        $this->overtimeRateBps = $overtimeRateBps;
    }

    public function getOvertimeRate2Bps(): ?int
    {
        return $this->overtimeRate2Bps;
    }

    public function setOvertimeRate2Bps(?int $overtimeRate2Bps): void
    {
        $this->overtimeRate2Bps = $overtimeRate2Bps;
    }

    public function getOvertimeThresholdWeeklyMinutes(): ?int
    {
        return $this->overtimeThresholdWeeklyMinutes;
    }

    public function setOvertimeThresholdWeeklyMinutes(?int $overtimeThresholdWeeklyMinutes): void
    {
        $this->overtimeThresholdWeeklyMinutes = $overtimeThresholdWeeklyMinutes;
    }

    public function getEmployeeContributionRateBps(): int
    {
        return $this->employeeContributionRateBps;
    }

    public function setEmployeeContributionRateBps(int $employeeContributionRateBps): void
    {
        $this->employeeContributionRateBps = $employeeContributionRateBps;
    }

    public function getPasRateBps(): int
    {
        return $this->pasRateBps;
    }

    public function setPasRateBps(int $pasRateBps): void
    {
        $this->pasRateBps = $pasRateBps;
    }

    public function getNetEstimateMode(): NetEstimateMode
    {
        return $this->netEstimateMode;
    }

    public function setNetEstimateMode(NetEstimateMode $netEstimateMode): void
    {
        $this->netEstimateMode = $netEstimateMode;
    }

    public function getArchivedAt(): ?\DateTimeImmutable
    {
        return $this->archivedAt;
    }

    public function archive(): void
    {
        $this->archivedAt = new \DateTimeImmutable();
    }

    public function isArchived(): bool
    {
        return null !== $this->archivedAt;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
