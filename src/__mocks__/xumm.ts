/**
 * Jest manual mock for the xumm package.
 * Provides a minimal Xumm class stub used across unit tests.
 */

export const Xumm = jest.fn().mockImplementation(() => ({
  authorize: jest.fn().mockResolvedValue({
    me: { account: 'rMockXamanAddress1234567890123456' },
  }),
  payload: {
    create: jest.fn().mockResolvedValue({
      uuid: 'mock-uuid-1234',
      next: { always: 'https://xumm.app/sign/mock-uuid-1234' },
      refs: {
        qr_png: 'https://xumm.app/sign/mock-uuid-1234_q.png',
        qr_matrix: '',
        qr_uri_quality_opts: [],
        websocket_status: 'wss://xumm.app/sign/mock-uuid-1234',
      },
      pushed: false,
    }),
    createAndSubscribe: jest.fn().mockResolvedValue({
      created: {
        uuid: 'mock-uuid-1234',
        next: { always: 'https://xumm.app/sign/mock-uuid-1234' },
        refs: {
          qr_png: 'https://xumm.app/sign/mock-uuid-1234_q.png',
          qr_matrix: '',
          qr_uri_quality_opts: [],
          websocket_status: 'wss://xumm.app/sign/mock-uuid-1234',
        },
        pushed: false,
      },
      resolved: Promise.resolve({ signed: true, txid: 'MOCK_TX_HASH', account: 'rMockAddress' }),
      resolve: jest.fn(),
      websocket: {},
      payload: {},
    }),
  },
}))
