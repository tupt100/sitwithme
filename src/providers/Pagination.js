export class Pagination {
  static tokens = {};

  static getNextToken(querySignature, page) {
    // Initialize the array of tokens
    if (!this.tokens[querySignature]) {
      this.tokens[querySignature] = [];
    }

    if (
      page !== 1 &&
      typeof this.tokens[querySignature][page - 1] === "undefined"
    ) {
      return undefined;
    }

    return this.tokens[querySignature][page - 1] ?? null;
  }

  static saveNextToken(nextToken, querySignature, page) {
    // Initialize the array of tokens
    if (!this.tokens[querySignature]) {
      this.tokens[querySignature] = [];
    }

    this.tokens[querySignature][page] = nextToken;
  }
}