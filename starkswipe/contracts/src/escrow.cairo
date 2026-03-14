#[starknet::contract]
mod Escrow {
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};

    #[storage]
    struct Storage {
        client: ContractAddress,
        freelancer: ContractAddress,
        amount: u256,
        client_signed: bool,
        freelancer_signed: bool,
        released: bool,
    }

    #[external(v0)]
    fn initialize(ref self: ContractState, freelancer: ContractAddress, amount: u256) {
        self.client.write(get_caller_address());
        self.freelancer.write(freelancer);
        self.amount.write(amount);
    }

    #[external(v0)]
    fn sign(ref self: ContractState) {
        let caller = get_caller_address();
        if caller == self.client.read() { self.client_signed.write(true); }
        if caller == self.freelancer.read() { self.freelancer_signed.write(true); }
    }

    #[external(v0)]
    fn release(ref self: ContractState) {
        assert(self.client_signed.read() && self.freelancer_signed.read(), 'Both must sign');
        assert(!self.released.read(), 'Already released');
        self.released.write(true);
        // Transfer logic here
    }
}
