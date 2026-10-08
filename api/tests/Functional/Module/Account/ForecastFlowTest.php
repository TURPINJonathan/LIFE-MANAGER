<?php

declare(strict_types=1);

namespace App\Tests\Functional\Module\Account;

use App\Module\Security\Contract\Service\IUserProvisioner;
use App\Module\Security\Domain\Enum\UserRole;
use App\Tests\ResetsSchemaTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class ForecastFlowTest extends WebTestCase
{
    use ResetsSchemaTrait;

    private KernelBrowser $client;
    private string $token;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $manager = static::getContainer()->get(EntityManagerInterface::class);
        $this->resetDatabaseSchema($manager);

        $provisioner = static::getContainer()->get(IUserProvisioner::class);
        $provisioner->create('ada@life-manager.test', 'Secret123456', 'Ada', 'Lovelace', [UserRole::User]);

        $this->client->request(
            'POST',
            '/api/login',
            server: ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'],
            content: json_encode(['email' => 'ada@life-manager.test', 'password' => 'Secret123456'], \JSON_THROW_ON_ERROR),
        );
        $payload = json_decode($this->client->getResponse()->getContent() ?: '', true, 512, \JSON_THROW_ON_ERROR);
        $this->token = $payload['token'];
    }

    public function testCreateDuplicateAndStats(): void
    {
        $expense = $this->json('POST', '/api/categories', [
            'name'  => 'Courses',
            'icon'  => 'shopping_cart',
            'color' => '#16A34A',
            'kind'  => 'expense',
        ]);
        $income = $this->json('POST', '/api/categories', [
            'name'  => 'Salaire',
            'icon'  => 'payments',
            'color' => '#2563EB',
            'kind'  => 'income',
        ]);

        $account = $this->json('POST', '/api/accounts', ['name' => 'Perso']);
        $sub = $this->json('POST', '/api/accounts/'.$account['id'].'/sub-accounts', [
            'name'                => 'Courant',
            'icon'                => 'account_balance',
            'color'               => '#2563EB',
            'openingBalanceCents' => 50_000,
        ]);

        $forecast = $this->json('POST', '/api/sub-accounts/'.$sub['id'].'/forecasts', [
            'yearMonth' => '2026-01',
            'lines'     => [
                ['categoryId' => $income['id'], 'plannedAmountCents' => 200_000],
                ['categoryId' => $expense['id'], 'plannedAmountCents' => 25_000, 'scheduledDay' => 3],
                ['categoryId' => $expense['id'], 'plannedAmountCents' => 15_000, 'scheduledDay' => 15],
            ],
        ]);
        self::assertResponseStatusCodeSame(201);
        self::assertSame('2026-01', $forecast['yearMonth']);
        self::assertCount(3, $forecast['lines']);
        self::assertSame(3, $forecast['lines'][1]['scheduledDay']);
        self::assertSame(15, $forecast['lines'][2]['scheduledDay']);

        $dup = $this->json('POST', '/api/sub-accounts/'.$sub['id'].'/forecasts/duplicate', [
            'sourceYearMonth' => '2026-01',
            'targetYearMonth' => '2026-02',
        ]);
        self::assertResponseStatusCodeSame(201);
        self::assertSame('2026-02', $dup['yearMonth']);
        self::assertCount(3, $dup['lines']);
        self::assertSame(15, $dup['lines'][2]['scheduledDay']);

        $this->json('POST', '/api/sub-accounts/'.$sub['id'].'/transactions', [
            'categoryId'    => $expense['id'],
            'operationDate' => '2026-02-05',
            'effectiveDate' => '2026-02-05',
            'paymentMethod' => 'card',
            'designation'   => 'Courses',
            'amountCents'   => 15_000,
        ]);
        self::assertResponseStatusCodeSame(201);

        $stats = $this->json('GET', '/api/sub-accounts/'.$sub['id'].'/forecast-stats?yearMonth=2026-02');
        self::assertTrue($stats['hasForecast']);
        self::assertSame(50_000, $stats['balances']['openingCents']);
        self::assertSame(200_000, $stats['totals']['plannedIncomeCents']);
        self::assertSame(40_000, $stats['totals']['plannedExpenseCents']);
        self::assertSame(15_000, $stats['totals']['actualExpenseCents']);
        self::assertSame(35_000, $stats['balances']['endOfMonthActualCents']);
        self::assertSame(210_000, $stats['balances']['projectedBudgetCents']);
        self::assertCount(3, $stats['categories']);
        self::assertSame(3, $stats['categories'][1]['scheduledDay']);
        self::assertSame(9_375, $stats['categories'][1]['actualAmountCents']);
        self::assertSame(5_625, $stats['categories'][2]['actualAmountCents']);
        self::assertCount(29, $stats['timeline']);
        self::assertSame(0, $stats['timeline'][0]['day']);
        self::assertSame(50_000, $stats['timeline'][0]['budgetBalanceCents']);
        self::assertSame(50_000, $stats['timeline'][0]['realisticBalanceCents']);
        self::assertArrayHasKey('budgetBalanceCents', $stats['timeline'][0]);
        self::assertArrayHasKey('realisticBalanceCents', $stats['timeline'][0]);
        self::assertSame(-25_000, $stats['timeline'][3]['budgetBalanceCents'] - $stats['timeline'][2]['budgetBalanceCents']);
        // Day 15 planned expense for 2nd line
        self::assertSame(-15_000, $stats['timeline'][15]['budgetBalanceCents'] - $stats['timeline'][14]['budgetBalanceCents']);

        $this->client->request('DELETE', '/api/forecasts/'.$dup['id'], server: $this->authHeaders());
        self::assertResponseStatusCodeSame(204);

        $gone = $this->json('GET', '/api/sub-accounts/'.$sub['id'].'/forecasts?yearMonth=2026-02');
        self::assertNull($gone);
    }

    public function testPreviousMonthSnapshotExposesScheduledLines(): void
    {
        $expense = $this->json('POST', '/api/categories', [
            'name'  => 'Loyer',
            'icon'  => 'home',
            'color' => '#2563EB',
            'kind'  => 'expense',
        ]);
        $income = $this->json('POST', '/api/categories', [
            'name'  => 'Salaire',
            'icon'  => 'payments',
            'color' => '#16A34A',
            'kind'  => 'income',
        ]);
        $account = $this->json('POST', '/api/accounts', ['name' => 'Perso']);
        $sub = $this->json('POST', '/api/accounts/'.$account['id'].'/sub-accounts', [
            'name'                => 'Courant',
            'icon'                => 'account_balance',
            'color'               => '#2563EB',
            'openingBalanceCents' => 10_000,
        ]);

        $this->json('POST', '/api/sub-accounts/'.$sub['id'].'/forecasts', [
            'yearMonth' => '2026-01',
            'lines'     => [
                ['categoryId' => $income['id'], 'plannedAmountCents' => 200_000],
                ['categoryId' => $expense['id'], 'plannedAmountCents' => 40_000, 'scheduledDay' => 5],
                ['categoryId' => $expense['id'], 'plannedAmountCents' => 20_000, 'scheduledDay' => 20],
            ],
        ]);

        // Budget courant sans Loyer → Loyer devient orphelin M−1.
        $this->json('POST', '/api/sub-accounts/'.$sub['id'].'/forecasts', [
            'yearMonth' => '2026-02',
            'lines'     => [
                ['categoryId' => $income['id'], 'plannedAmountCents' => 200_000],
            ],
        ]);

        $stats = $this->json('GET', '/api/sub-accounts/'.$sub['id'].'/forecast-stats?yearMonth=2026-02');
        self::assertNotNull($stats['previousMonth'] ?? null);
        $orphans = $stats['previousMonth']['orphans'];
        self::assertCount(1, $orphans);
        self::assertSame($expense['id'], $orphans[0]['categoryId']);
        self::assertSame(
            [
                ['plannedAmountCents' => 40_000, 'scheduledDay' => 5],
                ['plannedAmountCents' => 20_000, 'scheduledDay' => 20],
            ],
            $orphans[0]['previousLines'],
        );

        $categories = $stats['previousMonth']['categories'];
        $incomePrev = null;
        foreach ($categories as $row) {
            if ($row['categoryId'] === $income['id']) {
                $incomePrev = $row;
                break;
            }
        }
        self::assertNotNull($incomePrev);
        self::assertSame(
            [['plannedAmountCents' => 200_000, 'scheduledDay' => null]],
            $incomePrev['previousLines'],
        );
    }

    public function testYearSeriesCalendarAndRolling(): void
    {
        $expense = $this->json('POST', '/api/categories', [
            'name'  => 'Courses',
            'icon'  => 'shopping_cart',
            'color' => '#16A34A',
            'kind'  => 'expense',
        ]);
        $income = $this->json('POST', '/api/categories', [
            'name'  => 'Salaire',
            'icon'  => 'payments',
            'color' => '#2563EB',
            'kind'  => 'income',
        ]);
        $account = $this->json('POST', '/api/accounts', ['name' => 'Perso']);
        $sub = $this->json('POST', '/api/accounts/'.$account['id'].'/sub-accounts', [
            'name'                => 'Courant',
            'icon'                => 'account_balance',
            'color'               => '#2563EB',
            'openingBalanceCents' => 0,
        ]);

        $this->json('POST', '/api/sub-accounts/'.$sub['id'].'/forecasts', [
            'yearMonth' => '2026-01',
            'lines'     => [
                ['categoryId' => $income['id'], 'plannedAmountCents' => 200_000],
                ['categoryId' => $expense['id'], 'plannedAmountCents' => 40_000],
            ],
        ]);
        self::assertResponseStatusCodeSame(201);

        $this->json('POST', '/api/sub-accounts/'.$sub['id'].'/transactions', [
            'categoryId'    => $income['id'],
            'operationDate' => '2026-01-10',
            'paymentMethod' => 'transfer',
            'designation'   => 'Salaire',
            'amountCents'   => 150_000,
        ]);
        self::assertResponseStatusCodeSame(201);
        $this->json('POST', '/api/sub-accounts/'.$sub['id'].'/transactions', [
            'categoryId'    => $expense['id'],
            'operationDate' => '2026-01-20',
            'paymentMethod' => 'card',
            'designation'   => 'Courses',
            'amountCents'   => 10_000,
        ]);
        self::assertResponseStatusCodeSame(201);
        $this->json('POST', '/api/sub-accounts/'.$sub['id'].'/transactions', [
            'categoryId'    => $income['id'],
            'operationDate' => '2025-12-15',
            'paymentMethod' => 'transfer',
            'designation'   => 'Prime',
            'amountCents'   => 50_000,
        ]);
        self::assertResponseStatusCodeSame(201);

        $calendar = $this->json('GET', '/api/forecast-stats/series?anchor=2026-03&span=calendar');
        self::assertResponseStatusCodeSame(200);
        self::assertSame('calendar', $calendar['span']);
        self::assertSame('2026-01', $calendar['from']);
        self::assertSame('2026-12', $calendar['to']);
        self::assertCount(12, $calendar['months']);
        self::assertSame('2026-01', $calendar['months'][0]['yearMonth']);
        self::assertSame(150_000, $calendar['months'][0]['actualIncomeCents']);
        self::assertSame(10_000, $calendar['months'][0]['actualExpenseCents']);
        self::assertSame(140_000, $calendar['months'][0]['actualNetCents']);
        self::assertSame(200_000, $calendar['months'][0]['plannedIncomeCents']);
        self::assertSame(40_000, $calendar['months'][0]['plannedExpenseCents']);
        self::assertSame(150_000, $calendar['totals']['actualIncomeCents']);
        self::assertSame(0, $calendar['months'][11]['actualIncomeCents']);
        self::assertCount(2, $calendar['categories']);
        // Revenus puis dépenses, alphabétique dans chaque groupe.
        self::assertSame('Salaire', $calendar['categories'][0]['categoryName']);
        self::assertSame('Courses', $calendar['categories'][1]['categoryName']);
        self::assertSame(150_000, $calendar['categories'][0]['actualIncomeCents']);
        self::assertSame(200_000, $calendar['categories'][0]['plannedIncomeCents']);
        self::assertSame(10_000, $calendar['categories'][1]['actualExpenseCents']);
        self::assertSame(40_000, $calendar['categories'][1]['plannedExpenseCents']);
        self::assertCount(12, $calendar['categories'][0]['months']);
        self::assertSame(150_000, $calendar['categories'][0]['months'][0]['actualIncomeCents']);
        self::assertSame(10_000, $calendar['categories'][1]['months'][0]['actualExpenseCents']);
        self::assertCount(1, $calendar['subAccounts']);
        self::assertSame('Courant', $calendar['subAccounts'][0]['subAccountName']);
        self::assertSame(150_000, $calendar['subAccounts'][0]['months'][0]['actualIncomeCents']);

        $rolling = $this->json('GET', '/api/forecast-stats/series?anchor=2026-01&span=rolling');
        self::assertResponseStatusCodeSame(200);
        self::assertSame('2025-02', $rolling['from']);
        self::assertSame('2026-01', $rolling['to']);
        self::assertCount(12, $rolling['months']);
        self::assertSame(50_000, $rolling['months'][10]['actualIncomeCents']);
        self::assertSame(200_000, $rolling['totals']['actualIncomeCents']);
    }

    /**
     * @param array<string, mixed>|null $body
     *
     * @return array<string, mixed>|null
     */
    private function json(string $method, string $uri, ?array $body = null): ?array
    {
        $server = $this->authHeaders();
        if (null !== $body) {
            $server['CONTENT_TYPE'] = 'application/json';
        }
        $this->client->request(
            $method,
            $uri,
            server: $server,
            content: null === $body ? null : json_encode($body, \JSON_THROW_ON_ERROR),
        );
        $content = $this->client->getResponse()->getContent() ?: '';
        if ('' === $content || 'null' === $content) {
            return null;
        }

        /** @var array<string, mixed> $payload */
        $payload = json_decode($content, true, 512, \JSON_THROW_ON_ERROR);

        return $payload;
    }

    /**
     * @return array<string, string>
     */
    private function authHeaders(): array
    {
        return [
            'HTTP_ACCEPT'        => 'application/json',
            'HTTP_AUTHORIZATION' => 'Bearer '.$this->token,
        ];
    }
}
