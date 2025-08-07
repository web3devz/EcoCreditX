// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title MicroCredit
 * @dev ERC-20 token for micro carbon credits with 2 decimal places
 * Integrates with Hedera Guardian PWE & dMRV Engine for project validation
 * 
 * References:
 * - Guardian PWE: https://github.com/hashgraph/guardian
 * - Hedera Sustainability: https://hedera.com/use-cases/sustainability
 * - Guardian 3.0: https://hedera.com/blog/hedera-guardian-3-0-sustainability-for-enterprise
 */
contract MicroCredit is ERC20, Ownable, Pausable {
    
    // Token has 2 decimal places (1 token = 1 full credit, 0.01 = micro-credit)
    uint8 private constant DECIMALS = 2;
    
    // Maximum supply cap (100 million credits)
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**DECIMALS;
    
    // Total credits retired (for transparency)
    uint256 public totalRetired;
    
    // Project registry mapping
    mapping(string => ProjectInfo) public projects;
    mapping(address => uint256) public retiredBalances;
    
    struct ProjectInfo {
        string projectId;
        string methodology; // e.g., "Verra VCS 2023"
        string location;
        uint256 totalCredits;
        uint256 availableCredits;
        bool isActive;
        address developer;
        uint256 pricePerCredit; // in wei
    }
    
    // Events for Guardian PWE integration
    event CreditsMinted(
        address indexed to, 
        uint256 amount, 
        string indexed projectId,
        string methodology
    );
    
    event CreditsRetired(
        address indexed by, 
        uint256 amount, 
        string reason,
        uint256 timestamp
    );
    
    event ProjectRegistered(
        string indexed projectId,
        address indexed developer,
        string methodology,
        uint256 totalCredits
    );
    
    event CreditsPurchased(
        address indexed buyer,
        string indexed projectId,
        uint256 amount,
        uint256 totalPrice
    );

    constructor(
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) Ownable(msg.sender) {}

    /**
     * @dev Returns the number of decimals (2 for micro-credits)
     */
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /**
     * @dev Register a new carbon project (called by Guardian PWE after validation)
     * @param projectId Unique project identifier from Guardian
     * @param developer Project developer address
     * @param methodology Carbon methodology (e.g., "Verra VCS 2023")
     * @param location Project location
     * @param totalCredits Total credits to be issued for this project
     * @param pricePerCredit Price per credit in wei
     */
    function registerProject(
        string memory projectId,
        address developer,
        string memory methodology,
        string memory location,
        uint256 totalCredits,
        uint256 pricePerCredit
    ) external onlyOwner {
        require(bytes(projectId).length > 0, "Invalid project ID");
        require(developer != address(0), "Invalid developer address");
        require(totalCredits > 0, "Credits must be greater than 0");
        require(!projects[projectId].isActive, "Project already registered");

        projects[projectId] = ProjectInfo({
            projectId: projectId,
            methodology: methodology,
            location: location,
            totalCredits: totalCredits,
            availableCredits: totalCredits,
            isActive: true,
            developer: developer,
            pricePerCredit: pricePerCredit
        });

        emit ProjectRegistered(projectId, developer, methodology, totalCredits);
    }

    /**
     * @dev Mint credits after Guardian PWE validation and dMRV verification
     * @param to Address to receive minted credits
     * @param amount Amount of credits to mint (with decimals)
     * @param projectId Associated project ID from Guardian
     */
    function mint(
        address to, 
        uint256 amount, 
        string memory projectId
    ) external onlyOwner whenNotPaused {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(totalSupply() + amount <= MAX_SUPPLY, "Would exceed max supply");
        require(projects[projectId].isActive, "Project not registered");
        require(projects[projectId].availableCredits >= amount, "Insufficient project credits");

        // Update project available credits
        projects[projectId].availableCredits -= amount;
        
        _mint(to, amount);
        
        emit CreditsMinted(to, amount, projectId, projects[projectId].methodology);
    }

    /**
     * @dev Purchase credits from a specific project
     * @param projectId Project to purchase credits from
     * @param amount Amount of credits to purchase
     */
    function purchaseCredits(string memory projectId, uint256 amount) external payable whenNotPaused {
        ProjectInfo storage project = projects[projectId];
        require(project.isActive, "Project not active");
        require(amount > 0, "Amount must be greater than 0");
        require(project.availableCredits >= amount, "Insufficient credits available");
        
        uint256 totalPrice = amount * project.pricePerCredit / (10**DECIMALS);
        require(msg.value >= totalPrice, "Insufficient payment");
        
        // Update project credits
        project.availableCredits -= amount;
        
        // Mint credits to buyer
        _mint(msg.sender, amount);
        
        // Send payment to project developer (minus platform fee if needed)
        payable(project.developer).transfer(totalPrice);
        
        // Refund excess payment
        if (msg.value > totalPrice) {
            payable(msg.sender).transfer(msg.value - totalPrice);
        }
        
        emit CreditsPurchased(msg.sender, projectId, amount, totalPrice);
        emit CreditsMinted(msg.sender, amount, projectId, project.methodology);
    }

    /**
     * @dev Retire credits (burn them permanently) with reason logging
     * Integrates with HCS (Hedera Consensus Service) for immutable retirement logging
     * @param amount Amount of credits to retire
     * @param reason Reason for retirement (e.g., "Corporate offsetting Q4 2024")
     */
    function retire(uint256 amount, string memory reason) external whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        require(bytes(reason).length > 0, "Retirement reason required");

        // Burn the tokens
        _burn(msg.sender, amount);
        
        // Update retirement tracking
        totalRetired += amount;
        retiredBalances[msg.sender] += amount;
        
        emit CreditsRetired(msg.sender, amount, reason, block.timestamp);
    }

    /**
     * @dev Get project information
     * @param projectId Project identifier
     * @return ProjectInfo struct with all project details
     */
    function getProject(string memory projectId) external view returns (ProjectInfo memory) {
        return projects[projectId];
    }

    /**
     * @dev Get total retired credits for an address
     * @param account Address to query
     * @return Total credits retired by the address
     */
    function getRetiredBalance(address account) external view returns (uint256) {
        return retiredBalances[account];
    }

    /**
     * @dev Update project price (project developer only)
     * @param projectId Project to update
     * @param newPrice New price per credit in wei
     */
    function updateProjectPrice(string memory projectId, uint256 newPrice) external {
        ProjectInfo storage project = projects[projectId];
        require(project.isActive, "Project not active");
        require(msg.sender == project.developer, "Only project developer");
        require(newPrice > 0, "Price must be greater than 0");
        
        project.pricePerCredit = newPrice;
    }

    /**
     * @dev Emergency pause function
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause function
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Get platform statistics
     * @return totalSupply_ Total credits issued
     * @return totalRetiredCredits Total credits retired
     * @return activeProjectsCount Number of active projects (placeholder)
     */
    function getPlatformStats() external view returns (
        uint256 totalSupply_,
        uint256 totalRetiredCredits,
        uint256 activeProjectsCount
    ) {
        return (totalSupply(), totalRetired, 0);
    }

    /**
     * @dev Withdraw contract balance (owner only, for platform fees)
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        payable(owner()).transfer(balance);
    }
}
