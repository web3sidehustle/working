// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


contract bUSDT {
    // ============ ERC20 Metadata ============
    string public constant name = "Bridged USDT";
    string public constant symbol = "bUSDT";
    uint8 public constant decimals = 6;

    // ============ ERC20 State ============
    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    // ============ Access Control ============
    address public owner;
    address public pendingOwner;
    mapping(address => bool) public minters;

    // ============ Compliance ============
    mapping(address => bool) public isBlacklisted;

    // ============ Pausing ============
    bool public paused;

    // ============ Claim / Faucet ============
    /// @notice Maximum amount that can be requested in a single `claim()` call.
    /// There is no lifetime limit — an address can call claim() again later,
    /// as long as each individual request stays within this cap.
    uint256 public constant CLAIM_LIMIT = 10 * 10 ** 6; // 10 bUSDT (6 decimals)

    /// @notice Whether the claim function is currently active.
    bool public claimEnabled;

    /// @notice Cumulative amount each address has claimed overall (stats only —
    /// not enforced as a cap, just useful for tracking/analytics/UIs).
    mapping(address => uint256) public totalClaimed;

    // ============ Events ============
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed minter, address indexed to, uint256 amount);
    event Burn(address indexed burner, address indexed from, uint256 amount);
    event MinterUpdated(address indexed account, bool isMinter);
    event Blacklisted(address indexed account, bool status);
    event Paused(address account);
    event Unpaused(address account);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Claimed(address indexed account, uint256 amount, uint256 totalClaimedByAccount);
    event ClaimEnabledUpdated(bool enabled);

    // ============ Modifiers ============
    modifier onlyOwner() {
        require(msg.sender == owner, "bUSDT: caller is not the owner");
        _;
    }

    modifier onlyMinter() {
        require(minters[msg.sender], "bUSDT: caller is not a minter");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "bUSDT: token transfers paused");
        _;
    }

    modifier notBlacklisted(address account) {
        require(!isBlacklisted[account], "bUSDT: account is blacklisted");
        _;
    }

    // ============ Constructor ============
    /// @param initialOwner address that will own the contract and can manage minters/pause/blacklist
    /// @param initialMinter address (e.g. bridge/vault contract) allowed to mint & burn bUSDT
    constructor(address initialOwner, address initialMinter) {
        require(initialOwner != address(0), "bUSDT: zero owner");
        owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);

        if (initialMinter != address(0)) {
            minters[initialMinter] = true;
            emit MinterUpdated(initialMinter, true);
        }
    }

    // ============ ERC20 Standard ============
    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function allowance(address tokenOwner, address spender) external view returns (uint256) {
        return _allowances[tokenOwner][spender];
    }

    function transfer(address to, uint256 amount)
        external
        whenNotPaused
        notBlacklisted(msg.sender)
        notBlacklisted(to)
        returns (bool)
    {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount)
        external
        notBlacklisted(msg.sender)
        returns (bool)
    {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount)
        external
        whenNotPaused
        notBlacklisted(from)
        notBlacklisted(to)
        returns (bool)
    {
        uint256 currentAllowance = _allowances[from][msg.sender];
        require(currentAllowance >= amount, "bUSDT: insufficient allowance");
        unchecked {
            _approve(from, msg.sender, currentAllowance - amount);
        }
        _transfer(from, to, amount);
        return true;
    }

    /// @notice Convenience helpers to adjust allowance safely (avoids the classic
    /// approve() front-running issue).
    function increaseAllowance(address spender, uint256 addedValue) external returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender] + addedValue);
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool) {
        uint256 currentAllowance = _allowances[msg.sender][spender];
        require(currentAllowance >= subtractedValue, "bUSDT: decreased allowance below zero");
        unchecked {
            _approve(msg.sender, spender, currentAllowance - subtractedValue);
        }
        return true;
    }

    // ============ Internal ERC20 Logic ============
    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "bUSDT: transfer from zero address");
        require(to != address(0), "bUSDT: transfer to zero address");

        uint256 fromBalance = _balances[from];
        require(fromBalance >= amount, "bUSDT: transfer amount exceeds balance");
        unchecked {
            _balances[from] = fromBalance - amount;
            _balances[to] += amount;
        }
        emit Transfer(from, to, amount);
    }

    function _approve(address tokenOwner, address spender, uint256 amount) internal {
        require(tokenOwner != address(0), "bUSDT: approve from zero address");
        require(spender != address(0), "bUSDT: approve to zero address");
        _allowances[tokenOwner][spender] = amount;
        emit Approval(tokenOwner, spender, amount);
    }

    // ============ Bridge Mint / Burn ============
    /// @notice Mint new bUSDT, typically called by the bridge contract once USDT
    /// has been locked/received on the source chain.
    function mint(address to, uint256 amount)
        external
        onlyMinter
        notBlacklisted(to)
        returns (bool)
    {
        require(to != address(0), "bUSDT: mint to zero address");
        _totalSupply += amount;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
        emit Mint(msg.sender, to, amount);
        return true;
    }

    /// @notice Burn bUSDT, typically called by the bridge contract when a user
    /// redeems bUSDT back to USDT on the source chain.
    function burn(address from, uint256 amount) external onlyMinter returns (bool) {
        uint256 fromBalance = _balances[from];
        require(fromBalance >= amount, "bUSDT: burn amount exceeds balance");
        unchecked {
            _balances[from] = fromBalance - amount;
        }
        _totalSupply -= amount;
        emit Transfer(from, address(0), amount);
        emit Burn(msg.sender, from, amount);
        return true;
    }

    /// @notice Lets a holder burn their own tokens directly (e.g. self-service redemption).
    function burnSelf(uint256 amount) external notBlacklisted(msg.sender) returns (bool) {
        uint256 senderBalance = _balances[msg.sender];
        require(senderBalance >= amount, "bUSDT: burn amount exceeds balance");
        unchecked {
            _balances[msg.sender] = senderBalance - amount;
        }
        _totalSupply -= amount;
        emit Transfer(msg.sender, address(0), amount);
        emit Burn(msg.sender, msg.sender, amount);
        return true;
    }

    // ============ Claim / Faucet ============
    /// @notice Claim up to `CLAIM_LIMIT` (10 bUSDT) per call. Can be called
    /// repeatedly — there is no lifetime cap, only a per-request cap.
    /// Tokens are paid out of this contract's own balance — fund that balance
    /// beforehand by having a minter call `mint(address(this), amount)`.
    /// @param amount how much to claim in this call (in base units, 6 decimals)
    function claim(uint256 amount)
        external
        whenNotPaused
        notBlacklisted(msg.sender)
        returns (bool)
    {
        require(claimEnabled, "bUSDT: claiming is not enabled");
        require(amount > 0, "bUSDT: amount must be greater than zero");
        require(amount <= CLAIM_LIMIT, "bUSDT: exceeds max amount per claim");
        require(_balances[address(this)] >= amount, "bUSDT: claim pool is empty, try a smaller amount or later");

        totalClaimed[msg.sender] += amount;
        _transfer(address(this), msg.sender, amount);

        emit Claimed(msg.sender, amount, totalClaimed[msg.sender]);
        return true;
    }

    /// @notice Convenience wrapper: claims the full CLAIM_LIMIT (10 bUSDT), or
    /// whatever remains in the pool if it holds less than that, in one call.
    function claimMax() external returns (uint256 claimedNow) {
        require(claimEnabled, "bUSDT: claiming is not enabled");
        require(!paused, "bUSDT: token transfers paused");
        require(!isBlacklisted[msg.sender], "bUSDT: account is blacklisted");

        uint256 poolBalance = _balances[address(this)];
        claimedNow = CLAIM_LIMIT < poolBalance ? CLAIM_LIMIT : poolBalance;
        require(claimedNow > 0, "bUSDT: claim pool is empty");

        totalClaimed[msg.sender] += claimedNow;
        _transfer(address(this), msg.sender, claimedNow);

        emit Claimed(msg.sender, claimedNow, totalClaimed[msg.sender]);
    }

    /// @notice Owner switch to turn the claim feature on/off.
    function setClaimEnabled(bool status) external onlyOwner {
        claimEnabled = status;
        emit ClaimEnabledUpdated(status);
    }

    // ============ Admin: Minters ============
    function setMinter(address account, bool status) external onlyOwner {
        require(account != address(0), "bUSDT: zero address");
        minters[account] = status;
        emit MinterUpdated(account, status);
    }

    // ============ Admin: Blacklist ============
    function setBlacklisted(address account, bool status) external onlyOwner {
        isBlacklisted[account] = status;
        emit Blacklisted(account, status);
    }

    // ============ Admin: Pause ============
    function pause() external onlyOwner {
        require(!paused, "bUSDT: already paused");
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        require(paused, "bUSDT: not paused");
        paused = false;
        emit Unpaused(msg.sender);
    }

    // ============ Admin: Ownership (2-step) ============
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "bUSDT: zero address");
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "bUSDT: caller is not the pending owner");
        address previousOwner = owner;
        owner = pendingOwner;
        pendingOwner = address(0);
        emit OwnershipTransferred(previousOwner, owner);
    }

    // ============ Recovery: rescue mistakenly sent ERC20 tokens ============
    /// @notice In case someone sends unrelated ERC20 tokens to this contract by
    /// mistake, the owner can recover them. Does NOT allow pulling bUSDT itself
    /// out of user balances (only tokens accidentally held by this contract).
    function rescueERC20(address token, address to, uint256 amount) external onlyOwner {
        require(token != address(this), "bUSDT: cannot rescue bUSDT itself");
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature("transfer(address,uint256)", to, amount)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "bUSDT: rescue transfer failed");
    }
}
