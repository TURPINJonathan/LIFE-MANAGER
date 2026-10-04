<?php

declare(strict_types=1);

namespace App\Module\Work\Repository;

use App\Module\Security\Domain\Entity\User;
use App\Module\Work\Domain\Entity\Job;
use App\Module\Work\Domain\Entity\WorkPlanEntry;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Uuid;

/**
 * @extends ServiceEntityRepository<WorkPlanEntry>
 */
class WorkPlanEntryRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, WorkPlanEntry::class);
    }

    public function save(WorkPlanEntry $entry): void
    {
        $this->getEntityManager()->persist($entry);
        $this->getEntityManager()->flush();
    }

    public function remove(WorkPlanEntry $entry): void
    {
        $this->getEntityManager()->remove($entry);
        $this->getEntityManager()->flush();
    }

    public function findOwned(Uuid $id, User $owner): ?WorkPlanEntry
    {
        /** @var WorkPlanEntry|null $entry */
        $entry = $this->createQueryBuilder('e')
            ->innerJoin('e.job', 'j')
            ->innerJoin('j.worker', 'w')
            ->andWhere('e.id = :id')
            ->andWhere('w.owner = :owner')
            ->setParameter('id', $id)
            ->setParameter('owner', $owner)
            ->getQuery()
            ->getOneOrNullResult();

        return $entry;
    }

    public function findForJobAndDate(Job $job, \DateTimeImmutable $date): ?WorkPlanEntry
    {
        return $this->findOneBy(['job' => $job, 'workDate' => $date]);
    }

    /**
     * @return list<WorkPlanEntry>
     */
    public function listForJobBetween(Job $job, \DateTimeImmutable $from, \DateTimeImmutable $to): array
    {
        /** @var list<WorkPlanEntry> $rows */
        $rows = $this->createQueryBuilder('e')
            ->andWhere('e.job = :job')
            ->andWhere('e.workDate >= :from')
            ->andWhere('e.workDate <= :to')
            ->setParameter('job', $job)
            ->setParameter('from', $from)
            ->setParameter('to', $to)
            ->orderBy('e.workDate', 'ASC')
            ->getQuery()
            ->getResult();

        return $rows;
    }
}
