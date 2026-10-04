<?php

declare(strict_types=1);

namespace App\Module\Work\Repository;

use App\Module\Security\Domain\Entity\User;
use App\Module\Work\Domain\Entity\Job;
use App\Module\Work\Domain\Entity\WorkDocument;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Uuid;

/**
 * @extends ServiceEntityRepository<WorkDocument>
 */
class WorkDocumentRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, WorkDocument::class);
    }

    public function save(WorkDocument $document): void
    {
        $this->getEntityManager()->persist($document);
        $this->getEntityManager()->flush();
    }

    public function remove(WorkDocument $document): void
    {
        $this->getEntityManager()->remove($document);
        $this->getEntityManager()->flush();
    }

    public function findOwned(Uuid $id, User $owner): ?WorkDocument
    {
        /** @var WorkDocument|null $doc */
        $doc = $this->createQueryBuilder('d')
            ->innerJoin('d.job', 'j')
            ->innerJoin('j.worker', 'w')
            ->andWhere('d.id = :id')
            ->andWhere('w.owner = :owner')
            ->setParameter('id', $id)
            ->setParameter('owner', $owner)
            ->getQuery()
            ->getOneOrNullResult();

        return $doc;
    }

    /**
     * @return list<WorkDocument>
     */
    public function listForJob(Job $job): array
    {
        /** @var list<WorkDocument> $rows */
        $rows = $this->createQueryBuilder('d')
            ->andWhere('d.job = :job')
            ->setParameter('job', $job)
            ->orderBy('d.createdAt', 'DESC')
            ->getQuery()
            ->getResult();

        return $rows;
    }
}
