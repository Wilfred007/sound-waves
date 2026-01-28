;; --------------------------------------
;; Audioblocks NFT Marketplace Contract
;; --------------------------------------
;; Description:
;; NFT marketplace for music artists to create, mint, and sell NFTs
;; Features: NFT creation, minting, secondary marketplace, royalties
;; --------------------------------------


;; --------------------------------------
;; Constants
;; --------------------------------------
(define-constant CONTRACT_OWNER tx-sender)
(define-constant MAX_TITLE_LEN 100)
(define-constant MAX_DESC_LEN 500)
(define-constant MAX_URI_LEN 256)


;; --------------------------------------
;; Errors
;; --------------------------------------
(define-constant ERR_NOT_AUTHORIZED (err u201))
(define-constant ERR_NFT_NOT_FOUND (err u202))
(define-constant ERR_ALREADY_LISTED (err u203))
(define-constant ERR_NOT_LISTED (err u204))
(define-constant ERR_NOT_OWNER (err u205))
(define-constant ERR_INVALID_PRICE (err u206))
(define-constant ERR_SOLD_OUT (err u207))
(define-constant ERR_INVALID_INPUT (err u208))
(define-constant ERR_INSUFFICIENT_FUNDS (err u209))
(define-constant ERR_SELF_PURCHASE (err u210))


;; --------------------------------------
;; Data Variables
;; --------------------------------------
(define-data-var nft-counter uint u0)
(define-data-var sale-counter uint u0)


;; --------------------------------------
;; Data Maps
;; --------------------------------------


;; NFT Collections (created by artists)
(define-map nft-collections
  uint
  {
    artist: principal,
    title: (string-ascii 100),
    description: (string-ascii 500),
    image-uri: (string-ascii 256),
    metadata-uri: (string-ascii 256),
    royalty-percentage: uint,
    total-supply: uint,
    minted-count: uint,
    mint-price: uint,
    is-active: bool,
    created-at: uint
  }
)


;; Individual NFT tokens
(define-map nft-tokens
  { collection-id: uint, token-id: uint }
  {
    owner: principal,
    minted-at: uint
  }
)


;; Marketplace listings
(define-map marketplace-listings
  { collection-id: uint, token-id: uint }
  {
    seller: principal,
    price: uint,
    listed-at: uint,
    is-active: bool
  }
)


;; Sales history
(define-map sales-history
  uint
  {
    collection-id: uint,
    token-id: uint,
    seller: principal,
    buyer: principal,
    price: uint,
    royalty-paid: uint,
    sold-at: uint
  }
)


;; User collections (list of NFTs owned by user)
(define-map user-nft-count principal uint)


;; --------------------------------------
;; Private Functions
;; --------------------------------------


(define-private (is-valid-uri (uri (string-ascii 256)))
  (> (len uri) u0)
)


;; --------------------------------------
;; Public Functions
;; --------------------------------------


;; Create NFT collection (artists only)
(define-public (create-nft-collection
    (title (string-ascii 100))
    (description (string-ascii 500))
    (image-uri (string-ascii 256))
    (metadata-uri (string-ascii 256))
    (royalty-percentage uint)
    (total-supply uint)
    (mint-price uint))
  (let ((caller tx-sender))
    ;; Validate inputs
    (asserts! (> (len title) u0) ERR_INVALID_INPUT)
    (asserts! (is-valid-uri image-uri) ERR_INVALID_INPUT)
    (asserts! (is-valid-uri metadata-uri) ERR_INVALID_INPUT)
    (asserts! (<= royalty-percentage u100) ERR_INVALID_INPUT)
    (asserts! (> total-supply u0) ERR_INVALID_INPUT)
    (asserts! (> mint-price u0) ERR_INVALID_INPUT)
    
    (let ((next-collection-id (+ (var-get nft-counter) u1)))
      (var-set nft-counter next-collection-id)
      (map-insert nft-collections next-collection-id {
        artist: caller,
        title: title,
        description: description,
        image-uri: image-uri,
        metadata-uri: metadata-uri,
        royalty-percentage: royalty-percentage,
        total-supply: total-supply,
        minted-count: u0,
        mint-price: mint-price,
        is-active: true,
        created-at: block-height
      })
      (ok next-collection-id)
    )
  )
)


;; Mint NFT (buy from artist)
(define-public (mint-nft (collection-id uint))
  (let ((caller tx-sender))
    (match (map-get? nft-collections collection-id)
      collection
        (begin
          (asserts! (get is-active collection) ERR_NOT_LISTED)
          (asserts! (< (get minted-count collection) (get total-supply collection)) ERR_SOLD_OUT)
          
          (let 
            (
              (mint-price (get mint-price collection))
              (artist (get artist collection))
              (new-minted-count (+ (get minted-count collection) u1))
              (token-id new-minted-count)
            )
            
            ;; Transfer payment to artist
            (try! (stx-transfer? mint-price caller artist))
            
            ;; Update collection minted count
            (map-set nft-collections collection-id 
              (merge collection { minted-count: new-minted-count }))
            
            ;; Create NFT token
            (map-insert nft-tokens 
              { collection-id: collection-id, token-id: token-id }
              { owner: caller, minted-at: block-height })
            
            ;; Update user NFT count
            (let ((current-count (default-to u0 (map-get? user-nft-count caller))))
              (map-set user-nft-count caller (+ current-count u1))
            )
            
            (ok token-id)
          )
        )
      ERR_NFT_NOT_FOUND
    )
  )
)


;; List NFT for sale
(define-public (list-nft (collection-id uint) (token-id uint) (price uint))
  (let ((caller tx-sender))
    (asserts! (> price u0) ERR_INVALID_PRICE)
    
    ;; Verify ownership
    (match (map-get? nft-tokens { collection-id: collection-id, token-id: token-id })
      token
        (begin
          (asserts! (is-eq caller (get owner token)) ERR_NOT_OWNER)
          
          ;; Check if already listed
          (asserts! (is-none (map-get? marketplace-listings 
            { collection-id: collection-id, token-id: token-id })) ERR_ALREADY_LISTED)
          
          ;; Create listing
          (map-insert marketplace-listings 
            { collection-id: collection-id, token-id: token-id }
            {
              seller: caller,
              price: price,
              listed-at: block-height,
              is-active: true
            })
          (ok true)
        )
      ERR_NFT_NOT_FOUND
    )
  )
)


;; Buy NFT from marketplace
(define-public (buy-nft (collection-id uint) (token-id uint))
  (let ((caller tx-sender))
    (match (map-get? marketplace-listings { collection-id: collection-id, token-id: token-id })
      listing
        (begin
          (asserts! (get is-active listing) ERR_NOT_LISTED)
          (asserts! (not (is-eq caller (get seller listing))) ERR_SELF_PURCHASE)
          
          (match (map-get? nft-collections collection-id)
            collection
              (let 
                (
                  (sale-price (get price listing))
                  (seller (get seller listing))
                  (artist (get artist collection))
                  (royalty-percentage (get royalty-percentage collection))
                  (royalty-amount (/ (* sale-price royalty-percentage) u100))
                  (seller-amount (- sale-price royalty-amount))
                  (next-sale-id (+ (var-get sale-counter) u1))
                )
                
                ;; Transfer payment to seller
                (try! (stx-transfer? seller-amount caller seller))
                
                ;; Pay royalty to artist
                (if (> royalty-amount u0)
                  (try! (stx-transfer? royalty-amount caller artist))
                  true
                )
                
                ;; Transfer ownership
                (map-set nft-tokens 
                  { collection-id: collection-id, token-id: token-id }
                  { owner: caller, minted-at: block-height })
                
                ;; Update user NFT counts
                (let ((seller-count (default-to u0 (map-get? user-nft-count seller)))
                      (buyer-count (default-to u0 (map-get? user-nft-count caller))))
                  (map-set user-nft-count seller (- seller-count u1))
                  (map-set user-nft-count caller (+ buyer-count u1))
                )
                
                ;; Remove listing
                (map-delete marketplace-listings 
                  { collection-id: collection-id, token-id: token-id })
                
                ;; Record sale
                (var-set sale-counter next-sale-id)
                (map-insert sales-history next-sale-id {
                  collection-id: collection-id,
                  token-id: token-id,
                  seller: seller,
                  buyer: caller,
                  price: sale-price,
                  royalty-paid: royalty-amount,
                  sold-at: block-height
                })
                
                (ok next-sale-id)
              )
            ERR_NFT_NOT_FOUND
          )
        )
      ERR_NOT_LISTED
    )
  )
)


;; Cancel listing
(define-public (cancel-listing (collection-id uint) (token-id uint))
  (let ((caller tx-sender))
    (match (map-get? marketplace-listings { collection-id: collection-id, token-id: token-id })
      listing
        (begin
          (asserts! (is-eq caller (get seller listing)) ERR_NOT_OWNER)
          (map-delete marketplace-listings 
            { collection-id: collection-id, token-id: token-id })
          (ok true)
        )
      ERR_NOT_LISTED
    )
  )
)


;; --------------------------------------
;; Read-Only Functions
;; --------------------------------------


;; Get NFT collection details
(define-read-only (get-nft-collection (collection-id uint))
  (ok (map-get? nft-collections collection-id))
)


;; Get NFT token owner
(define-read-only (get-nft-owner (collection-id uint) (token-id uint))
  (ok (map-get? nft-tokens { collection-id: collection-id, token-id: token-id }))
)


;; Get marketplace listing
(define-read-only (get-listing (collection-id uint) (token-id uint))
  (ok (map-get? marketplace-listings { collection-id: collection-id, token-id: token-id }))
)


;; Get user's NFT count
(define-read-only (get-user-nft-count (user principal))
  (ok (default-to u0 (map-get? user-nft-count user)))
)


;; Get total collections
(define-read-only (get-total-collections)
  (ok (var-get nft-counter))
)


;; Get total sales
(define-read-only (get-total-sales)
  (ok (var-get sale-counter))
)


;; Get sale details
(define-read-only (get-sale (sale-id uint))
  (ok (map-get? sales-history sale-id))
)