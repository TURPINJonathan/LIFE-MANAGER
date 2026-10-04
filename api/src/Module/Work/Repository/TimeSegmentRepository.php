<?php

declare(strict_types=1);

namespace App\Module\Work\Repository;

use App\Module\Work\Domain\Entity\TimeSegment;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<TimeSegment>
 */
class TimeSegmentRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, TimeSegment::class);
    }
}
