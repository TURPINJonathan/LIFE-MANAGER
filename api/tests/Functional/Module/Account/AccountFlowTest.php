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
            'name' => 'Courses',
            'icon' => 'shopping_cart',
            'color' => '#16A34A',
            'kind' => 'expense',
        ]);
        self::assertResponseStatusCodeSame(201);

        $account = $this->json('POST', '/api/accounts', ['name' => 'Comptes Ada']);
        self::assertResponseStatusCodeSame(201);

        $sub = $this->json('POST', '/api/accounts/'.$account['id'].'/sub-accounts', [
            'name' => 'Courant',
            'icon' => 'account_balance',
            'color' => '#2563EB',
            'openingBalanceCents' => 10_000,
        ]);
        self::assertResponseStatusCodeSame(201);
        self::assertSame(10_000, $sub['balanceCents']);

        $tx = $this->json('POST', '/api/sub-accounts/'.$sub['id'].'/transactions', [
            'categoryId' => $category['id'],
            'operationDate' => '2026-01-05',
            'effectiveDate' => '2026-01-05',
            'paymentMethod' => 'card',
            'designation' => 'Supermarché',
            'amountCents' => 2_500,
        ]);
        self::assertResponseStatusCodeSame(201);
        self::assertSame(7_500, $tx['balanceAfterCents']);

        $ledger = $this->json('GET', '/api/sub-accounts/'.$sub['id'].'/transactions');
        self::assertCount(1, $ledger['transactions']);
        self::assertSame(7_500, $ledger['transactions'][0]['balanceAfterCents']);

        $this->client->request(
            'DELETE',
            '/api/categories/'.$category['id'],
            server: $this->authHeaders(),
        );
        self::assertResponseStatusCodeSame(409);
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
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_AUTHORIZATION' => 'Bearer '.$this->token,
        ];
    }
}
