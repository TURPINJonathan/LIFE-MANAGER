<?php

declare(strict_types=1);

namespace App\Module\Work\Repository;

use App\Module\Security\Domain\Entity\User;
use App\Module\Work\Domain\Entity\Job;
use App\Module\Work\Domain\Entity\Worker;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Uuid;

/**
 * @extends ServiceEntityRepository<Job>
 */
class JobRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Job::class);
    }

    public function save(Job $job): void
    {
        $this->getEntityManager()->persist($job);
        $this->getEntityManager()->flush();
    }

    public function findOwned(Uuid $id, User $owner): ?Job
    {
        /** @var Job|null $job */
        $job = $this->createQueryBuilder('j')
            ->innerJoin('j.worker', 'w')
            ->andWhere('j.id = :id')
            ->andWhere('w.owner = :owner')
            ->setParameter('id', $id)
            ->setParameter('owner', $owner)
            ->getQuery()
            ->getOneOrNullResult();

        return $job;
    }

    /**
     * @return list<Job>
     */
    public function listForWorker(Worker $worker, bool $includeArchived = false): array
    {
        $qb = $this->createQueryBuilder('j')
            ->andWhere('j.worker = :worker')
            ->setParameter('worker', $worker)
            ->orderBy('j.position', 'ASC')
            ->addOrderBy('j.title', 'ASC');

        if (!$includeArchived) {
            $qb->andWhere('j.archivedAt IS NULL');
        }

        /** @var list<Job> $rows */
        $rows = $qb->getQuery()->getResult();

        return $rows;
    }

    /**
     * @return list<Job>
     */
    public function listForOwner(User $owner, bool $includeArchived = false): array
    {
        $qb = $this->createQueryBuilder('j')
            ->innerJoin('j.worker', 'w')
            ->andWhere('w.owner = :owner')
            ->setParameter('owner', $owner)
            ->orderBy('w.position', 'ASC')
            ->addOrderBy('j.position', 'ASC')
            ->addOrderBy('j.title', 'ASC');

        if (!$includeArchived) {
            $qb->andWhere('j.archivedAt IS NULL')
                ->andWhere('w.archivedAt IS NULL');
        }

        /** @var list<Job> $rows */
        $rows = $qb->getQuery()->getResult();

        return $rows;
    }
}
