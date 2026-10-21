package com.smartcrumbs.api.service.impl;

import com.smartcrumbs.api.dto.request.ProductRequest;
import com.smartcrumbs.api.dto.response.ProductResponse;
import com.smartcrumbs.api.entity.Product;
import com.smartcrumbs.api.entity.ProductCategory;
import com.smartcrumbs.api.entity.Supplier;
import com.smartcrumbs.api.enums.ProductOrigin;
import com.smartcrumbs.api.exception.BadRequestException;
import com.smartcrumbs.api.exception.ResourceNotFoundException;
import com.smartcrumbs.api.mapper.ProductMapper;
import com.smartcrumbs.api.repository.ProductCategoryRepository;
import com.smartcrumbs.api.repository.ProductRepository;
import com.smartcrumbs.api.repository.SupplierRepository;
import com.smartcrumbs.api.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final ProductCategoryRepository productCategoryRepository;
    private final SupplierRepository supplierRepository;

    @Override
    public ProductResponse create(ProductRequest request) {
        validateProductNameForCreate(request.name());

        ProductCategory category = findCategory(request.categoryId());
        Supplier supplier = findSupplierIfPresent(request.defaultSupplierId());

        Product product = new Product();
        applyRequest(product, request, category, supplier);

        Product saved = productRepository.save(product);
        return ProductMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductResponse> findAll(ProductOrigin origin, Long categoryId, Boolean activeOnly) {
        List<Product> products;

        if (origin != null) {
            products = productRepository.findByOriginAndActiveTrueOrderByNameAsc(origin);
        } else if (categoryId != null) {
            products = productRepository.findByCategoryIdAndActiveTrueOrderByNameAsc(categoryId);
        } else if (Boolean.TRUE.equals(activeOnly)) {
            products = productRepository.findByActiveTrueOrderByNameAsc();
        } else {
            products = productRepository.findAllByOrderByNameAsc();
        }

        return products.stream()
                .map(ProductMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ProductResponse findById(Long id) {
        Product product = findProduct(id);
        return ProductMapper.toResponse(product);
    }

    @Override
    public ProductResponse update(Long id, ProductRequest request) {
        Product product = findProduct(id);

        validateProductNameForUpdate(request.name(), id);

        ProductCategory category = findCategory(request.categoryId());
        Supplier supplier = findSupplierIfPresent(request.defaultSupplierId());

        applyRequest(product, request, category, supplier);

        Product saved = productRepository.save(product);
        return ProductMapper.toResponse(saved);
    }

    @Override
    public void delete(Long id) {
        Product product = findProduct(id);
        product.setActive(false);
        productRepository.save(product);
    }

    private void applyRequest(
            Product product,
            ProductRequest request,
            ProductCategory category,
            Supplier supplier
    ) {
        product.setName(request.name());
        product.setDescription(request.description());
        product.setCategory(category);
        product.setDefaultSupplier(supplier);
        product.setOrigin(request.origin());
        product.setPerishable(request.perishable());
        product.setUnitType(request.unitType());
        product.setCostPrice(request.costPrice());
        product.setSalePrice(request.salePrice());
        product.setMinimumStock(request.minimumStock());
        product.setActive(request.active() != null ? request.active() : true);
    }

    private Product findProduct(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado con id " + id));
    }

    private ProductCategory findCategory(Long id) {
        return productCategoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Categoría no encontrada con id " + id));
    }

    private Supplier findSupplierIfPresent(Long id) {
        if (id == null) {
            return null;
        }

        return supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado con id " + id));
    }

    private void validateProductNameForCreate(String name) {
        if (productRepository.existsByNameIgnoreCase(name)) {
            throw new BadRequestException("Ya existe un producto con el nombre " + name);
        }
    }

    private void validateProductNameForUpdate(String name, Long id) {
        if (productRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new BadRequestException("Ya existe otro producto con el nombre " + name);
        }
    }
}