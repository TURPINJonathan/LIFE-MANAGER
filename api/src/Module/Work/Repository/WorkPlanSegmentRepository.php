<?php

declare(strict_types=1);

namespace App\Module\Work\Repository;

use App\Module\Work\Domain\Entity\WorkPlanSegment;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<WorkPlanSegment>
 */
class WorkPlanSegmentRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, WorkPlanSegment::class);
    }
}
