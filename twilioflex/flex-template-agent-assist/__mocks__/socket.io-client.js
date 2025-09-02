const mockSocket = {
  connect: jest.fn(),
  emit: jest.fn(),
  on: jest.fn(),
  disconnect: jest.fn(),
  close: jest.fn(),
  // Add other methods as needed
};

const io = jest.fn((string) => mockSocket);

io.connect = jest.fn(() => mockSocket);

module.exports = { mockSocket, io};
