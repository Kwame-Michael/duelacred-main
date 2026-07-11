export const calculateInvestorWalletBalance = (verifiedFunding: number, totalInvested: number) => {
  const funding = Number(verifiedFunding || 0);
  const invested = Number(totalInvested || 0);
  return Math.max(0, funding - invested);
};
