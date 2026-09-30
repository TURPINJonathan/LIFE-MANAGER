<?php

declare(strict_types=1);

namespace App\Tests\Functional\Module\Account;

use App\Module\Security\Contract\Service\IUserProvisioner;
use App\Module\Security\Domain\Enum\UserRole;
use App\Tests\ResetsSchemaTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class AccountFlowTest extends WebTestCase
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

    public function testAccountSubAccountCategoryAndTransactionFlow(): void
    {
        $category = $this->json('POST', '/api/categories', [
            'name'  => 'Courses',
            'icon'  => 'shopping_cart',
            'color' => '#16A34A',
            'kind'  => 'expense',
        ]);
        self::assertResponseStatusCodeSame(201);

        $account = $this->json('POST', '/api/accounts', ['name' => 'Comptes Ada']);
        self::assertResponseStatusCodeSame(201);

        $sub = $this->json('POST', '/api/accounts/'.$account['id'].'/sub-accounts', [
            'name'                => 'Courant',
            'icon'                => 'account_balance',
            'color'               => '#2563EB',
            'openingBalanceCents' => 10_000,
        ]);
        self::assertResponseStatusCodeSame(201);
        self::assertSame(10_000, $sub['balanceCents']);

        $tx = $this->json('POST', '/api/sub-accounts/'.$sub['id'].'/transactions', [
            'categoryId'    => $category['id'],
            'operationDate' => '2026-01-05',
            'effectiveDate' => '2026-01-05',
            'paymentMethod' => 'card',
            'designation'   => 'Supermarché',
            'amountCents'   => 2_500,
        ]);
        self::assertResponseStatusCodeSame(201);
        self::assertSame(7_500, $tx['balanceAfterCents']);

        $ledger = $this->json('GET', '/api/sub-accounts/'.$sub['id'].'/transactions');
        self::assertCount(1, $ledger['transactions']);
        self::assertSame(7_500, $ledger['transactions'][0]['balanceAfterCents']);
        self::assertFalse($ledger['hasMore']);
        self::assertNull($ledger['nextOffset']);

        $this->client->request(
            'DELETE',
            '/api/categories/'.$category['id'],
            server: $this->authHeaders(),
        );
        self::assertResponseStatusCodeSame(409);
    }

    public function testLedgerPaginationReturnsNewestFirstWithRunningBalances(): void
    {
        $category = $this->json('POST', '/api/categories', [
            'name'  => 'Courses',
            'icon'  => 'shopping_cart',
            'color' => '#16A34A',
            'kind'  => 'expense',
        ]);
        $account = $this->json('POST', '/api/accounts', ['name' => 'Comptes Ada']);
        $sub = $this->json('POST', '/api/accounts/'.$account['id'].'/sub-accounts', [
            'name'                => 'Courant',
            'icon'                => 'account_balance',
            'color'               => '#2563EB',
            'openingBalanceCents' => 10_000,
        ]);

        $this->json('POST', '/api/sub-accounts/'.$sub['id'].'/transactions', [
            'categoryId'    => $category['id'],
            'operationDate' => '2026-01-01',
            'effectiveDate' => '2026-01-01',
            'paymentMethod' => 'card',
            'designation'   => 'Ancienne',
            'amountCents'   => 1_000,
        ]);
        $this->json('POST', '/api/sub-accounts/'.$sub['id'].'/transactions', [
            'categoryId'    => $category['id'],
            'operationDate' => '2026-01-02',
            'effectiveDate' => '2026-01-02',
            'paymentMethod' => 'card',
            'designation'   => 'Milieu',
            'amountCents'   => 2_000,
        ]);
        $this->json('POST', '/api/sub-accounts/'.$sub['id'].'/transactions', [
            'categoryId'    => $category['id'],
            'operationDate' => '2026-01-03',
            'effectiveDate' => '2026-01-03',
            'paymentMethod' => 'card',
            'designation'   => 'Récente',
            'amountCents'   => 3_000,
        ]);

        $page1 = $this->json('GET', '/api/sub-accounts/'.$sub['id'].'/transactions?limit=2&offset=0');
        self::assertTrue($page1['hasMore']);
        self::assertSame(2, $page1['nextOffset']);
        self::assertCount(2, $page1['transactions']);
        self::assertSame('Récente', $page1['transactions'][0]['designation']);
        self::assertSame(4_000, $page1['transactions'][0]['balanceAfterCents']);
        self::assertSame('Milieu', $page1['transactions'][1]['designation']);
        self::assertSame(7_000, $page1['transactions'][1]['balanceAfterCents']);

        $page2 = $this->json('GET', '/api/sub-accounts/'.$sub['id'].'/transactions?limit=2&offset=2');
        self::assertFalse($page2['hasMore']);
        self::assertNull($page2['nextOffset']);
        self::assertCount(1, $page2['transactions']);
        self::assertSame('Ancienne', $page2['transactions'][0]['designation']);
        self::assertSame(9_000, $page2['transactions'][0]['balanceAfterCents']);
    }

    /**
     * @param array<string, mixed>|null $body
     *
     * @return array<string, mixed>
     */
    private function json(string $method, string $uri, ?array $body = null): array
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
        if ('' === $content) {
            return [];
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
