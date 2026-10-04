<?php

declare(strict_types=1);

namespace App\Module\Work\Repository;

use App\Module\Security\Domain\Entity\User;
use App\Module\Work\Domain\Entity\Worker;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Uuid;

/**
 * @extends ServiceEntityRepository<Worker>
 */
class WorkerRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Worker::class);
    }

    public function save(Worker $worker): void
    {
        $this->getEntityManager()->persist($worker);
        $this->getEntityManager()->flush();
    }

    public function findOwned(Uuid $id, User $owner): ?Worker
    {
        return $this->findOneBy(['id' => $id, 'owner' => $owner]);
    }

    /**
     * @return list<Worker>
     */
    public function listForOwner(User $owner, bool $includeArchived = false): array
    {
        $qb = $this->createQueryBuilder('w')
            ->andWhere('w.owner = :owner')
            ->setParameter('owner', $owner)
            ->orderBy('w.position', 'ASC')
            ->addOrderBy('w.displayName', 'ASC');

        if (!$includeArchived) {
            $qb->andWhere('w.archivedAt IS NULL');
        }

        /** @var list<Worker> $rows */
        $rows = $qb->getQuery()->getResult();

        return $rows;
    }
}
