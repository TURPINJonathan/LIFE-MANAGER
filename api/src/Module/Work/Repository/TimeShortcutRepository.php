<?php

declare(strict_types=1);

namespace App\Module\Work\Repository;

use App\Module\Security\Domain\Entity\User;
use App\Module\Work\Domain\Entity\Job;
use App\Module\Work\Domain\Entity\TimeShortcut;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Uuid;

/**
 * @extends ServiceEntityRepository<TimeShortcut>
 */
class TimeShortcutRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, TimeShortcut::class);
    }

    public function save(TimeShortcut $shortcut): void
    {
        $this->getEntityManager()->persist($shortcut);
        $this->getEntityManager()->flush();
    }

    public function remove(TimeShortcut $shortcut): void
    {
        $this->getEntityManager()->remove($shortcut);
        $this->getEntityManager()->flush();
    }

    public function findOwned(Uuid $id, User $owner): ?TimeShortcut
    {
        /** @var TimeShortcut|null $shortcut */
        $shortcut = $this->createQueryBuilder('s')
            ->innerJoin('s.job', 'j')
            ->innerJoin('j.worker', 'w')
            ->andWhere('s.id = :id')
            ->andWhere('w.owner = :owner')
            ->setParameter('id', $id)
            ->setParameter('owner', $owner)
            ->getQuery()
            ->getOneOrNullResult();

        return $shortcut;
    }

    /**
     * @return list<TimeShortcut>
     */
    public function listForJob(Job $job): array
    {
        /** @var list<TimeShortcut> $rows */
        $rows = $this->createQueryBuilder('s')
            ->andWhere('s.job = :job')
            ->setParameter('job', $job)
            ->orderBy('s.position', 'ASC')
            ->addOrderBy('s.label', 'ASC')
            ->getQuery()
            ->getResult();

        return $rows;
    }
}
